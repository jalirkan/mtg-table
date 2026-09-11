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
 * The member list of this class mirrors forge.gui.interfaces.IGuiBase from
 * Forge (Card Forge project, GPL-3.0-or-later); the no-op bodies follow the
 * shape of forge-gui/tools/java/ForgeMatrixWriter.java's HeadlessGui.
 */
package mtgtable;

import java.io.File;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

import org.jupnp.UpnpServiceConfiguration;

import forge.gamemodes.match.HostedMatch;
import forge.gui.download.GuiDownloadService;
import forge.gui.interfaces.IGuiBase;
import forge.gui.interfaces.IGuiGame;
import forge.item.PaperCard;
import forge.localinstance.skin.FSkinProp;
import forge.localinstance.skin.ISkinImage;
import forge.sound.IAudioClip;
import forge.sound.IAudioMusic;
import forge.util.FSerializableFunction;
import forge.util.ImageFetcher;

/**
 * The headless {@code IGuiBase} for mtg-table.  Two things matter here; the
 * other forty-odd members are deliberately inert.
 *
 * <h2>1. It must be installed before any other Forge call</h2>
 *
 * {@code ForgeConstants} is a constant holder whose class initializer calls
 * {@code GuiBase.getInterface().getAssetsDir()}
 * (forge-gui/src/main/java/forge/localinstance/properties/ForgeConstants.java:37,232-240).
 * Touch any {@code ForgeConstants} field before
 * {@code GuiBase.setInterface(new HeadlessGuiBase(...))} and the JVM dies with
 * {@code ExceptionInInitializerError} caused by {@code NullPointerException}.
 * Never construct {@code forge.GuiDesktop} instead: its static initializer calls
 * {@code GraphicsEnvironment.getDefaultScreenDevice()} and throws
 * {@code HeadlessException} with no display.
 *
 * <h2>2. {@link #isGuiThread()} must be real, not a constant</h2>
 *
 * Forge guards its input machinery with
 * {@code FThreads.assertExecutedByEdt(boolean)}
 * (forge-gui/src/main/java/forge/gui/FThreads.java:15-24), and every blocking
 * human input opens with {@code assertExecutedByEdt(false)}
 * (forge-gui/src/main/java/forge/gamemodes/match/input/InputSyncronizedBase.java:22).
 * A constant {@code true} therefore throws {@code IllegalStateException} at the
 * very first mulligan prompt:
 *
 * <pre>
 *   java.lang.IllegalStateException:
 *     forge.gamemodes.match.input.InputSyncronizedBase.awaitLatchRelease
 *     may not be accessed from the event dispatch thread.
 * </pre>
 *
 * So we run one real stand-in event dispatch thread -- a single-thread executor
 * whose thread is named {@value #EDT_NAME} -- and {@code isGuiThread()} tests
 * whether the caller is on it.  There is an escape hatch at FThreads.java:16
 * ({@code GuiBase.isNetPlay(null)} skips the assertion, so {@code hasNetGame()}
 * returning true would silence it), but the assertion is protecting a real
 * deadlock, so we do the threading properly and leave {@code hasNetGame()} false.
 *
 * <h2>The thread map this class creates</h2>
 *
 * <table>
 *   <caption>threads</caption>
 *   <tr><td>{@value #EDT_NAME}</td>
 *       <td>our virtual EDT.  Everything Forge dispatches through
 *           {@code FThreads.invokeInEdtLater} lands here: prompts, button
 *           updates, selectables.</td></tr>
 *   <tr><td>{@value #BG_NAME}</td>
 *       <td>{@link #runBackgroundTask}.  Deliberately NOT named {@code Game*},
 *           because {@code ThreadUtil.isGameThread()} is a
 *           {@code getName().startsWith("Game")} test
 *           (forge-core/src/main/java/forge/util/ThreadUtil.java:51-53) and a
 *           background task must never be mistaken for the game thread by the
 *           snapshot asserts.</td></tr>
 * </table>
 *
 * Not thread-confined itself: all state is final and the executor is thread safe.
 */
public final class HeadlessGuiBase implements IGuiBase {

    /**
     * The name of our stand-in EDT.  Public because later classes assert against
     * it: a snapshot may only be built on the game thread, and an answer to a
     * blocking call may come from neither the game thread nor this one.
     */
    public static final String EDT_NAME = "mtg-table-EDT";

    /** The name given to {@link #runBackgroundTask} threads. */
    public static final String BG_NAME = "mtg-table-bg";

    /**
     * Every thread name this class creates, checked at class-init against the
     * one test Forge uses to decide what the game thread is.
     *
     * <p>{@code forge.util.ThreadUtil.isGameThread()} is a bare
     * {@code Thread.currentThread().getName().startsWith("Game")}
     * (forge-core/src/main/java/forge/util/ThreadUtil.java:51-53) -- a prefix
     * match on a string, with no registry and no identity.  {@code Snap}'s
     * game-thread assert is built on it, so a thread of ours named
     * {@code "GameWatcher"} or {@code "Gameplay-EDT"} would be allowed to walk
     * the view graph and would corrupt the {@code Tracker} <em>silently</em>.
     * The cost of this check is one string comparison per JVM; the cost of
     * discovering it the other way is a corrupted snapshot with no exception.
     */
    static {
        for (final String name : new String[] {EDT_NAME, BG_NAME}) {
            if (name.startsWith("Game")) {
                throw new ExceptionInInitializerError(
                    "thread name \"" + name + "\" starts with \"Game\", which is the WHOLE of "
                    + "ThreadUtil.isGameThread(): Forge would treat this thread as the game "
                    + "thread and let it walk the Tracker off-thread, which corrupts it silently");
            }
        }
    }

    /** Single thread, named, daemon, so a wedged task cannot keep the JVM alive. */
    private final ExecutorService edt = Executors.newSingleThreadExecutor(r -> {
        final Thread t = new Thread(r, EDT_NAME);
        t.setDaemon(true);
        return t;
    });

    /** Absolute, and guaranteed to end in {@link File#separator}. */
    private final String assetsDir;

    /**
     * @param forgeHome the mtg-table-owned Forge home -- the directory holding
     *                  {@code res} (a symlink to Forge's read-only resource tree)
     *                  and {@code forge.profile.properties}.  A trailing
     *                  separator is added if missing, because {@code ForgeConstants}
     *                  concatenates this string with {@code "res/"} and
     *                  {@code "forge.profile.properties"} without inserting one.
     */
    public HeadlessGuiBase(final String forgeHome) {
        final String abs = new File(forgeHome).getAbsolutePath();
        this.assetsDir = abs.endsWith(File.separator) ? abs : abs + File.separator;
    }

    /** True when the calling thread is our stand-in EDT. */
    public static boolean onEdt() {
        return EDT_NAME.equals(Thread.currentThread().getName());
    }

    /** Shut the virtual EDT down.  Optional: the thread is a daemon. */
    public void shutdown() {
        edt.shutdownNow();
    }

    // ------------------------------------------------------------------
    // Identity and paths
    // ------------------------------------------------------------------

    /** True selects the desktop asset layout and the desktop profile defaults. */
    @Override public boolean isRunningOnDesktop() { return true; }

    @Override public boolean isLibgdxPort() { return false; }

    /** Only ever used for log banners (GuiBase.getHWInfo). */
    @Override public String getCurrentVersion() { return "mtg-table-headless"; }

    @Override public String getAssetsDir() { return assetsDir; }

    // ------------------------------------------------------------------
    // Threading -- the part that is not boilerplate
    // ------------------------------------------------------------------

    /**
     * Forge only calls this from {@code FThreads.invokeInEdtNowOrLater} after it
     * has already established that the caller is on the GUI thread, so running
     * inline is correct (and is what {@code GuiDesktop} does).
     */
    @Override public void invokeInEdtNow(final Runnable proc) { proc.run(); }

    @Override public void invokeInEdtLater(final Runnable proc) { edt.execute(proc); }

    @Override public void invokeInEdtAndWait(final Runnable proc) {
        if (onEdt()) {
            // Dispatching to a single-thread executor from that same thread and
            // then waiting for it is a guaranteed deadlock.
            proc.run();
            return;
        }
        try {
            edt.submit(proc).get();
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("interrupted waiting for the mtg-table EDT", e);
        } catch (final Exception e) {
            throw new RuntimeException("mtg-table EDT task failed", e);
        }
    }

    @Override public void runBackgroundTask(final String message, final Runnable task) {
        final Thread t = new Thread(task, BG_NAME);
        t.setDaemon(true);
        t.start();
    }

    /** MUST NOT be a constant -- see the class javadoc. */
    @Override public boolean isGuiThread() { return onEdt(); }

    // ------------------------------------------------------------------
    // Images and skin -- there is no skin, so every one of these is null
    // ------------------------------------------------------------------

    @Override public ImageFetcher getImageFetcher() { return null; }

    @Override public ISkinImage getSkinIcon(final FSkinProp skinProp) { return null; }

    @Override public ISkinImage getUnskinnedIcon(final String path) { return null; }

    @Override public ISkinImage getCardArt(final PaperCard card, final boolean backFace) { return null; }

    @Override public ISkinImage createLayeredImage(final PaperCard card, final FSkinProp background,
                                                   final String overlayFilename, final float opacity) {
        return null;
    }

    @Override public void clearImageCache() { }

    /** Identity: the browser renders mana symbols itself from the JSON mana cost. */
    @Override public String encodeSymbols(final String str, final boolean formatReminderText) { return str; }

    @Override public int getAvatarCount() { return 0; }

    @Override public int getSleevesCount() { return 0; }

    @Override public float getScreenScale() { return 1.0f; }

    // ------------------------------------------------------------------
    // Desktop integration -- all no-ops in a headless process
    // ------------------------------------------------------------------

    @Override public void preventSystemSleep(final boolean preventSleep) { }

    /**
     * Report "did not download" rather than blocking: mtg-table never downloads
     * anything through Forge.  Card art comes from tools/fetch-art.ts.
     */
    @Override public void download(final GuiDownloadService service, final Consumer<Boolean> callback) {
        callback.accept(false);
    }

    @Override public void copyToClipboard(final String text) { }

    @Override public void browseToUrl(final String url) { }

    // ------------------------------------------------------------------
    // Dialogs.  These are the *lobby/shell* dialogs, not the in-game ones --
    // in-game questions arrive through IGuiGame, which WireGuiGame will answer
    // over the WebSocket.  Nothing here may block: there is no one to ask.
    // ------------------------------------------------------------------

    @Override public void showCardList(final String title, final String message, final List<PaperCard> list) { }

    @Override public boolean showBoxedProduct(final String title, final String message, final List<PaperCard> list) {
        return false;
    }

    @Override public void showBugReportDialog(final String title, final String text, final boolean showExitAppBtn) { }

    @Override public void showImageDialog(final ISkinImage image, final String message, final String title) { }

    @Override public int showOptionDialog(final String message, final String title, final FSkinProp icon,
                                          final List<String> options, final int defaultOption) {
        return defaultOption;
    }

    @Override public String showInputDialog(final String message, final String title, final FSkinProp icon,
                                            final String initialInput, final List<String> inputOptions,
                                            final boolean isNumeric) {
        return initialInput;
    }

    @Override public String showFileDialog(final String title, final String defaultDir) { return defaultDir; }

    @Override public File getSaveFile(final File defaultFile) { return defaultFile; }

    /** Identity: keep the order the engine proposed. */
    @Override public <T> List<T> order(final String title, final String top,
                                       final int remainingObjectsMin, final int remainingObjectsMax,
                                       final List<T> sourceChoices, final List<T> destChoices) {
        return destChoices;
    }

    /** Identity: accept whatever the engine pre-selected. */
    @Override public <T> List<T> getChoices(final String message, final int min, final int max,
                                            final Collection<T> choices, final Collection<T> selected,
                                            final FSerializableFunction<T, String> display) {
        return new ArrayList<>(selected);
    }

    @Override public PaperCard chooseCard(final String title, final String message, final List<PaperCard> list) {
        return list == null || list.isEmpty() ? null : list.get(0);
    }

    // ------------------------------------------------------------------
    // Sound -- silent
    // ------------------------------------------------------------------

    @Override public boolean isSupportedAudioFormat(final File file) { return false; }

    @Override public IAudioClip createAudioClip(final String filename) { return null; }

    @Override public IAudioMusic createAudioMusic(final String filename) { return null; }

    @Override public void startAltSoundSystem(final String filename, final boolean isSynchronized) { }

    // ------------------------------------------------------------------
    // Quest-mode shells -- unreachable, we never start a quest
    // ------------------------------------------------------------------

    @Override public void showSpellShop() { }

    @Override public void showBazaar() { }

    // ------------------------------------------------------------------
    // Match plumbing
    // ------------------------------------------------------------------

    /**
     * Null for now.  Forge calls this when *it* wants to create a GUI for a
     * match it is starting on its own (the lobby path); mtg-table constructs
     * WireGuiGame itself and hands it to {@code HostedMatch.startMatch}.  If a
     * future code path ever needs one, return a new WireGuiGame here.
     */
    @Override public IGuiGame getNewGuiGame() { return null; }

    /** Same reasoning as {@link #getNewGuiGame()}: we own the HostedMatch. */
    @Override public HostedMatch hostMatch() { return null; }

    @Override public UpnpServiceConfiguration getUpnpPlatformService() { return null; }

    /**
     * MUST stay false.  {@code GuiBase.isNetPlay(null)} calls this, and
     * {@code FThreads.assertExecutedByEdt} returns early when it is true --
     * which would disable exactly the assertion that catches a thread-model
     * mistake.  mtg-table is not a Forge net game; the browser is on the far
     * side of our own socket, not Forge's.
     */
    @Override public boolean hasNetGame() { return false; }
}
