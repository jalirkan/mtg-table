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

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import forge.LobbyPlayer;
import forge.ai.AIOption;
import forge.ai.AiProfileUtil;
import forge.deck.Deck;
import forge.gui.GuiBase;
import forge.localinstance.properties.ForgeConstants;
import forge.localinstance.properties.ForgePreferences;
import forge.localinstance.properties.ForgePreferences.FPref;
import forge.model.FModel;
import forge.player.GamePlayerUtil;
import mtgtable.ai.PolicyLobbyPlayerAi;

/**
 * The boot sequence every mtg-table process shares, in the one order that works.
 *
 * <p>There is exactly one of these because the order is load-bearing and every
 * entry point (M0 {@code Smoke}, M1 {@code RecordMatch}, M2 {@code MtgTable})
 * needs the identical sequence.  A second copy is a second place to get it
 * wrong.
 *
 * <ol>
 *   <li>{@link #installGui} -- {@code GuiBase.setInterface(new HeadlessGuiBase)}
 *       must be the <b>first</b> Forge call in the process.  {@code
 *       ForgeConstants}' static initializer calls
 *       {@code GuiBase.getInterface().getAssetsDir()}, so touching any Forge
 *       constant first is an {@code ExceptionInInitializerError}.</li>
 *   <li>{@link #initializeModel} -- preferences, card database, AI profiles,
 *       and the three preference decisions below.</li>
 * </ol>
 *
 * <h2>The preferences, and why each one is set here</h2>
 *
 * <p><b>{@code UI_SELECT_FROM_CARD_DISPLAYS = "false"}</b> (decision D13, report
 * 06 sections 0.3 / P5).  It defaults to {@code "true"}
 * (ForgePreferences.java:157), and with it true
 * {@code PlayerControllerHuman.useSelectCardsInput} routes library / graveyard /
 * exile / command / sideboard choices to {@code InputSelectEntitiesFromList} --
 * a <em>click a card on the board</em> input.  Our {@code state} carries no
 * library cards a client could click (protocol section 3.4), so the user would
 * be asked to click cards that are not in the snapshot and the game would look
 * hung.  With it false, every such choice arrives as an {@code ask} that carries
 * its own cards, which is what protocol section 5 models.  It also closes report
 * 06's P4: {@code arrangeForScry} otherwise reaches
 * {@code IGuiGame.manipulateCardList} with the player's <b>entire library, in
 * library order</b>.
 *
 * <p><b>{@code LOAD_CARD_SCRIPTS_LAZILY} must be {@code "false"}</b> -- asserted,
 * not set, because it is read <em>during</em> {@code FModel.initialize} and
 * because its default already is {@code "false"} (ForgePreferences.java:226).
 * It matters for the card overlay below: under lazy loading the main reader is
 * consulted on demand and the ordering guarantee that lets
 * {@code StaticData.loadCustomCards()} overwrite a stock card weakens
 * ({@code StaticData.resetLazyLoadedCards()} exists because of exactly that).
 *
 * <p><b>{@code ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE = "true"}</b>, set
 * <em>before</em> {@code FModel.initialize} because {@code FModel}'s
 * {@code StaticData} supplier reads it at construction
 * (FModel.java:83-90) and is memoized.  {@code StaticData.loadCustomCards()}
 * calls {@code CardRules.setCustom()} on everything it loads, and
 * {@code DeckFormat.getDeckConformanceProblem} rejects a deck containing a
 * custom card unless this is on (DeckFormat.java:449, :600-601).  Our one
 * overlay (decision D14: {@code a_i_m_scientists.txt} minus its spurious
 * {@code K:Trample}) would otherwise make the user's own deck illegal.
 *
 * <p>{@code prefs.save()} is <b>never</b> called: these are in-memory decisions
 * for this process, not edits to the user's preference file.
 */
public final class Bootstrap {

    private Bootstrap() { }

    /**
     * Step 1: install the headless {@code IGuiBase}.  Must be the first Forge
     * call in the process; never {@code forge.GuiDesktop} (its static
     * initializer throws {@code HeadlessException} with no display).
     *
     * @param forgeHome the mtg-table-owned Forge home (holds {@code res} and
     *                  {@code forge.profile.properties})
     * @return the installed gui base, for callers that want to shut its EDT down
     */
    public static HeadlessGuiBase installGui(final String forgeHome) {
        final HeadlessGuiBase gui = new HeadlessGuiBase(forgeHome);
        GuiBase.setInterface(gui);
        return gui;
    }

    /**
     * Step 2: {@code FModel.initialize} plus the preference decisions above.
     * Both {@code initialize} arguments may be null: no progress bar, no
     * preference overrides.
     *
     * @param verbose print what was set (Smoke does, so the M0 evidence shows it)
     * @return how long {@code FModel.initialize} took, in milliseconds
     */
    public static long initializeModel(final boolean verbose) {
        final ForgePreferences prefs = FModel.getPreferences();

        // Read during FModel.initialize -- assert rather than set, and fail
        // loudly, because the card overlay's "custom wins over stock" ordering
        // depends on the main reader having loaded eagerly.
        final String lazy = prefs.getPref(FPref.LOAD_CARD_SCRIPTS_LAZILY);
        if (!"false".equals(lazy)) {
            throw new IllegalStateException(
                "FPref.LOAD_CARD_SCRIPTS_LAZILY is \"" + lazy + "\", expected \"false\": "
                + "with lazy card loading StaticData.loadCustomCards() no longer reliably "
                + "overrides a stock card, which is what forge-home/custom-cards/ depends on "
                + "(decision D14).");
        }

        // Decision D14, NOT D13 -- this one exists for the card overlay.
        // Must precede FModel.initialize: FModel's StaticData supplier reads
        // this pref when it builds the card database, and it is memoized.
        prefs.setPref(FPref.ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE, "true");

        final long t = System.nanoTime();
        FModel.initialize(null, null);
        final long initMs = (System.nanoTime() - t) / 1_000_000L;

        // Decision D13.  Immediately after initialize, before the first game.
        prefs.setPref(FPref.UI_SELECT_FROM_CARD_DISPLAYS, "false");
        // NEVER prefs.save() -- that writes var/forge/forge.preferences and
        // turns a per-process decision into a persistent edit.

        if (verbose) {
            System.out.println("FModel.initialize took " + initMs + " ms");
            System.out.println("pref UI_SELECT_FROM_CARD_DISPLAYS = "
                    + prefs.getPref(FPref.UI_SELECT_FROM_CARD_DISPLAYS)
                    + "   (D13: library/graveyard choices must arrive as an ask, not as a board click)");
            System.out.println("pref LOAD_CARD_SCRIPTS_LAZILY     = "
                    + prefs.getPref(FPref.LOAD_CARD_SCRIPTS_LAZILY) + "   (asserted false)");
            System.out.println("pref ALLOW_CUSTOM_CARDS...        = "
                    + prefs.getPref(FPref.ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE)
                    + "   (D14: the A.I.M. Scientists overlay is a 'custom' card)");
            System.out.println("custom cards dir = " + ForgeConstants.USER_CUSTOM_CARDS_DIR
                    + " (" + customCardCount() + " file(s))");
        }
        return initMs;
    }

    // ==================================================================
    // AI profiles (match setup, protocol amendment M44; report 11 section 9)
    // ==================================================================

    /** The profile every entry point uses when nobody asked for another. */
    public static final String DEFAULT_AI_PROFILE = "Default";

    /**
     * The AI profiles this checkout can play against: the base names of the
     * {@code .ai} files in {@code <forgeHome>/res/ai/}, sorted.  In 2.0.14 that
     * is {@code Cautious, Default, Experimental, Reckless}.
     *
     * <p>Plain {@code java.io}, no Forge class, so it is safe to call
     * <b>before</b> {@link #installGui}: an unknown {@code --ai-profile} fails in
     * the argument check rather than ten seconds into {@code FModel.initialize}.
     * The directory is the one {@code FModel.initialize} itself loads
     * ({@code AiProfileUtil.loadAllProfiles(ForgeConstants.AI_PROFILE_DIR)},
     * {@code AI_PROFILE_DIR = RES_DIR + "ai/"}), through the
     * {@code forge-home/res} symlink -- read-only.
     *
     * @param forgeHome {@link Config#forgeHomeDir()}, ending in a separator
     */
    public static List<String> aiProfiles(final String forgeHome) {
        final File dir = new File(forgeHome, "res" + File.separator + "ai");
        final String[] files = dir.list((d, n) -> n.endsWith(".ai"));
        final List<String> out = new ArrayList<>();
        if (files != null) {
            for (final String f : files) {
                out.add(f.substring(0, f.length() - ".ai".length()));
            }
        }
        Collections.sort(out);
        return out;
    }

    /**
     * {@code --ai-profile}'s value, validated and canonicalised: matched
     * case-insensitively against {@link #aiProfiles} and returned with the
     * file's own spelling, so {@code reckless} plays {@code Reckless} and the
     * wire says {@code "Reckless"}.  {@code null} means {@link #DEFAULT_AI_PROFILE}.
     *
     * <p><b>No "Random" entry.</b>  Forge's display list also offers
     * {@code "Random (Every Match)"} and {@code "Random (Every Game)"}; both draw
     * from {@code MyRandom}, which would make a seeded run's profile a function
     * of the shuffle, and neither is a file.  A picker that wants them resolves
     * one itself (report 11 section 9 says how).
     *
     * @throws IllegalArgumentException naming every valid profile
     */
    public static String resolveAiProfile(final String forgeHome, final String requested) {
        return resolveAiProfile(forgeHome, requested, "--ai-profile");
    }

    /**
     * {@link #resolveAiProfile(String, String)} for a flag with another name --
     * {@code RecordMatch}'s {@code --profile}, which seats an AI on the deck of
     * seat 0 (amendment M47) -- so the refusal names the flag the caller typed.
     */
    public static String resolveAiProfile(final String forgeHome, final String requested, final String flag) {
        final String want = requested == null ? DEFAULT_AI_PROFILE : requested.trim();
        final List<String> have = aiProfiles(forgeHome);
        for (final String p : have) {
            if (p.equalsIgnoreCase(want)) {
                return p;
            }
        }
        throw new IllegalArgumentException(flag + " \"" + requested + "\" is not one of "
                + (have.isEmpty() ? "(no .ai files found)" : String.join(", ", have))
                + " -- the .ai files in " + new File(forgeHome, "res" + File.separator + "ai"));
    }

    /**
     * THE way an mtg-table process seats a Forge AI: always with an explicit,
     * non-empty {@code profileOverride}.
     *
     * <p><b>Why this is not {@code createAiPlayer(name, avatar)}</b> -- which is
     * what all three entry points called before match setup.  That overload
     * delegates with {@code profileOverride = ""}, and the five-argument
     * overload's empty-override branch (bytecode offsets 28-83 in 2.0.14) reads
     * {@code FPref.UI_CURRENT_AI_PROFILE}; when the value is not in
     * {@code AiProfileUtil.getProfilesDisplayList()} it prints a line, sets
     * {@code "Default"} and calls <b>{@code ForgePreferences.save()}</b> -- which
     * would write every in-memory decision this class makes (D13, D14, the
     * mana-lost prompt) into {@code var/forge/preferences/forge.preferences} as a
     * persistent edit.  It never fired, because the pref is {@code "Default"}
     * unless a preferences file says otherwise; it is closed anyway, because
     * "the file happened to be absent" is not a rule.
     *
     * <p>The three-argument overload is chosen over the five-argument one on
     * purpose: it is the same call path the old two-argument one took, sleeve
     * index and all ({@code HeadlessGuiBase.getSleevesCount()} is 0, so no
     * {@code MyRandom} draw either way), which keeps a seeded {@code Default}
     * game the game it was.
     *
     * <p>Must run after {@link #initializeModel}: it asserts that
     * {@code AiProfileUtil} actually <b>loaded</b> the profile.  That is not
     * belt and braces -- {@code AiProfileUtil.getAIProp} silently falls back
     * to every property's built-in default for a profile name it has no map
     * for, so a file that exists but failed to load would play the game on
     * defaults while every line of output named the profile.
     */
    public static LobbyPlayer createAiPlayer(final String name, final int avatar, final String profile) {
        checkAiProfile(profile);
        return GamePlayerUtil.createAiPlayer(name, avatar, profile);
    }

    /**
     * An AI seat with mtg-table's own controller in front of Forge's (D309): the
     * same profile checks as {@link #createAiPlayer}, then a
     * {@link PolicyLobbyPlayerAi} -- which never reaches {@code GamePlayerUtil}
     * at all, so no preferences branch exists on this path -- with Forge's
     * simulation option ({@code AIOption}; null for none: simulation is a
     * lobby-player option, not an {@code .ai} profile key) and the
     * sacrifice-outlet policy's mode (D310).  Sleeve 0, which is what
     * {@link #createAiPlayer} gets from a headless GUI with no sleeves.  Used by
     * {@code tools/ai-bench/}; none of the game's own entry points calls it, so
     * every seat they make, and every recording, is unchanged.
     */
    public static PolicyLobbyPlayerAi createAiSeat(final String name, final int avatar, final String profile,
                                                   final AIOption simulation,
                                                   final PolicyLobbyPlayerAi.Outlets outlets) {
        return createAiSeat(name, avatar, profile, simulation, outlets, null);
    }

    /**
     * {@link #createAiSeat(String, int, String, AIOption, PolicyLobbyPlayerAi.Outlets)}
     * with the determinized rollout search (D312) in front of Forge's priority,
     * attack and block decisions; {@code search} null = none.  Used by the bench
     * and by {@code MtgTable --ai-policy search} (opt-in, D314).
     */
    public static PolicyLobbyPlayerAi createAiSeat(final String name, final int avatar, final String profile,
                                                   final AIOption simulation,
                                                   final PolicyLobbyPlayerAi.Outlets outlets,
                                                   final mtgtable.ai.SearchConfig search) {
        checkAiProfile(profile);
        final PolicyLobbyPlayerAi p = new PolicyLobbyPlayerAi(name, simulation, outlets, search);
        p.setAiProfile(profile);
        p.setAvatarIndex(avatar);
        p.setSleeveIndex(0);
        return p;
    }

    private static void checkAiProfile(final String profile) {
        if (profile == null || profile.isEmpty()) {
            throw new IllegalArgumentException("an AI profile is required: an empty profileOverride "
                    + "reaches GamePlayerUtil's branch that saves the preferences file");
        }
        if (!AiProfileUtil.getAvailableProfiles().contains(profile)) {
            throw new IllegalStateException("AI profile \"" + profile + "\" has a file but was not "
                    + "loaded by FModel.initialize (AiProfileUtil.getAvailableProfiles() = "
                    + AiProfileUtil.getAvailableProfiles() + ")");
        }
    }

    /**
     * A deck's public name (amendment M44, D105): its {@code [metadata] Name=},
     * or the file's base name without {@code .dck} when the deck has none.
     * Never a path.  The one definition, shared by {@code MtgTable}'s
     * {@code hello_ok.match} and {@code RecordMatch}'s (M47), so the two
     * emitters cannot name the same deck two ways.
     */
    public static String deckName(final Deck d, final File f) {
        final String n = d.getName();
        if (n != null && !n.trim().isEmpty()) {
            return n.trim();
        }
        final String b = f.getName();
        return b.endsWith(".dck") ? b.substring(0, b.length() - ".dck".length()) : b;
    }

    /**
     * How many {@code .txt} files sit in Forge's user card-overlay directory.
     *
     * <p>{@code CardStorageReader} <b>throws</b> when its directory does not
     * exist and {@code FModel} swallows that into {@code customReader = null}
     * (FModel.java:214-222), and {@code USER_CUSTOM_CARDS_DIR} is not one of the
     * 24 directories {@code FModel.initialize} creates -- so a missing directory
     * silently means "no overlay".  {@code tools/make-forge-home.sh} creates it
     * and copies {@code forge-home/custom-cards/*.txt} into it; this is how a run
     * says out loud whether that happened.
     */
    public static int customCardCount() {
        final File dir = new File(ForgeConstants.USER_CUSTOM_CARDS_DIR);
        if (!dir.isDirectory()) {
            return 0;
        }
        final String[] names = dir.list((d, n) -> n.endsWith(".txt"));
        return names == null ? 0 : names.length;
    }
}
