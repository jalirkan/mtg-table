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

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.google.common.collect.Multimap;
import com.google.common.collect.Multiset;

import forge.card.mana.ManaCost;
import forge.card.MagicColor;
import forge.game.GameEntityView;
import forge.game.GameView;
import forge.game.card.CardView;
import forge.game.card.CounterType;
import forge.game.combat.CombatView;
import forge.game.event.GameEvent;
import forge.game.event.GameEventAttackersDeclared;
import forge.game.event.GameEventBlockersDeclared;
import forge.game.event.GameEventCardAttachment;
import forge.game.event.GameEventCardChangeZone;
import forge.game.event.GameEventCardCounters;
import forge.game.event.GameEventCardDamaged;
import forge.game.event.GameEventCardForetold;
import forge.game.event.GameEventCardPhased;
import forge.game.event.GameEventCardSacrificed;
import forge.game.event.GameEventCardStatsChanged;
import forge.game.event.GameEventCardTapped;
import forge.game.event.GameEventCombatEnded;
import forge.game.event.GameEventGameOutcome;
import forge.game.event.GameEventLandPlayed;
import forge.game.event.GameEventMulligan;
import forge.game.event.GameEventPlayerDamaged;
import forge.game.event.GameEventPlayerLivesChanged;
import forge.game.event.GameEventPlayerPoisoned;
import forge.game.event.GameEventScry;
import forge.game.event.GameEventShuffle;
import forge.game.event.GameEventSpellAbilityCast;
import forge.game.event.GameEventSpellRemovedFromStack;
import forge.game.event.GameEventSpellResolved;
import forge.game.event.GameEventSurveil;
import forge.game.event.GameEventTurnBegan;
import forge.game.event.GameEventTurnPhase;
import forge.game.keyword.Keyword;
import forge.game.keyword.KeywordCollectionView;
import forge.game.keyword.KeywordView;
import forge.game.player.PlayerView;
import forge.game.spellability.SpellAbilityView;
import forge.game.spellability.StackItemView;
import forge.game.zone.ZoneType;
import forge.game.zone.ZoneView;
import forge.util.ThreadUtil;

import mtgtable.Json.JsonOut;

/**
 * The Forge view graph, projected to the {@code state} body of
 * {@code docs/protocol.md} section 3.
 *
 * <h2>Game thread only</h2>
 *
 * Every public entry point opens with a {@link ThreadUtil#isGameThread()}
 * assert.  {@code Tracker}'s own javadoc
 * (forge-game/src/main/java/forge/trackable/Tracker.java:26-32) says the view
 * graph is game-thread-only and not thread safe; walking it from the EDT or
 * from a socket thread corrupts it <em>silently</em>, which is far worse than a
 * crash.  This is why snapshots are built in {@code handleGameEvents} (which a
 * hand-registered {@code GameEventForwarder} delivers on the game thread) and
 * never in {@code updateCards} / {@code updateZones}, which arrive on the EDT.
 *
 * <h2>Wire conventions (docs/guides/java-for-typescript-people.md)</h2>
 *
 * Three rules this file must keep, each one a way the Java emitter and the
 * TypeScript reducer can disagree without anybody noticing:
 *
 * <ol type="a">
 *   <li><b>An enum reaches the wire as {@code .name()}, never
 *   {@code toString()}.</b>  {@code name()} is the declared constant and is
 *   final; {@code toString()} is overridable and several Forge enums override it
 *   ({@code forge.card.CardRarity} returns {@code "Common"} where
 *   {@code name()} is {@code "Common"} only by luck, and its {@code Special} is
 *   not its name at all).  A string built for a Swing table cell is not a wire
 *   value.  Java also calls {@code toString()} implicitly in
 *   {@code "" + e}, so never concatenate an enum into a JSON value.</li>
 *   <li><b>A nullable integer goes through {@link JsonOut#nInt} with an
 *   {@code Integer}, never through {@code n(String, long)}.</b>  The {@code long}
 *   overload cannot express null and an {@code Integer} silently unboxes into
 *   it, so a null id turns into a {@code NullPointerException} at emit time --
 *   or, worse, a {@code 0} that the reducer reads as player 0.</li>
 *   <li><b>Every key derived from a {@code CardStateView} is written in BOTH
 *   branches of the null-state check.</b>  The renderer must never have to test
 *   for the absence of a key: a key it knows is either a value or an explicit
 *   {@code null}.  The two branches of {@link #card} therefore emit the same key
 *   set in the same order, and adding a key to one without the other is a bug
 *   the fixtures will not catch (the null branch has never been observed).</li>
 * </ol>
 *
 * <h2>One redaction function, three gates</h2>
 *
 * {@link #card} is the <b>only</b> function in the bridge that turns a
 * {@link CardView} into JSON -- {@code players[].zones} (including the revealed
 * subset of {@code library}) and {@code state.stackCards} all go through it --
 * and it opens with both of Forge's own visibility predicates, plus one of ours
 * ({@link #concealedByZoneHint}, "gate 0": the caller found this card by
 * iterating a zone, so a missing {@code ZoneType} property must not open an
 * opponent's hand):
 *
 * <ol>
 *   <li>{@code cv.canBeShownTo(viewer)} -- may the viewer see the card at all?
 *   No: five keys, {@code id} / {@code zone} / {@code owner} /
 *   {@code controller} / {@code hidden}, and nothing else.  ({@code owner} is
 *   there because {@code canBeShownTo}'s {@code case Hand} compares
 *   <em>controllers</em> while the zone arrays are keyed by the zone's player,
 *   and when the two diverge the client would otherwise be guessing.)</li>
 *   <li>{@code cv.isFaceDown() && cv.canFaceDownBeShownTo(viewer)} -- may the
 *   viewer see <em>which card</em> it is?  This gate does not produce a shape of
 *   its own: the snapshot reads {@code getCurrentState()} and nothing else, and
 *   for a face-down card that state is
 *   {@code CardUtil.getFaceDownCharacteristic} -- no name, set code
 *   {@code "???"}, a 2/2 Creature -- which is exactly what every player at the
 *   table can see.  What the gate controls is the one place the real face could
 *   reach the wire: the optional {@code alt} block, read from
 *   {@code getAlternateState()} and emitted <b>only</b> when this predicate is
 *   true (protocol 3.2).  Gate 1 alone is not enough, because it returns
 *   {@code true} unconditionally for Battlefield, Stack, Graveyard and Command,
 *   face down or not.</li>
 * </ol>
 *
 * There is deliberately no third path that could forget, because Forge itself
 * does <b>not</b> redact: its own {@code DeltaSyncManager.collectDeltas} ships
 * opponent hands and libraries and hides them client-side, so the default
 * failure mode of any new serialisation code here is leaking the opponent's
 * hand.
 *
 * <h2>The second path: stack text</h2>
 *
 * {@link #card} is the only function that turns a {@code CardView} into a card
 * object, but it is <b>not</b> the only thing on the wire that can name a card:
 * {@code stack[].text} and {@code events[].cast.text} carry
 * {@code StackItemView.getText()}, which is Forge's stack description.  That
 * string was assumed to be public and was ungated, and the assumption is false:
 * a face-down creature's death trigger came out as
 * {@code "When Ashcloud Phoenix dies, return it to the battlefield face down
 * under your control. [Zone Changer: Ashcloud Phoenix (75)]"} in the same frame
 * that serialised card 75 as a face-down card with no {@code alt} (in the shape
 * of the day, {@code faceDownHidden}) -- the name twice, and the
 * id to join it to.  Forge redacts the <em>cast</em> of a morph
 * ("Morph - Creature 2/2") but not a <em>trigger</em> of one, so which path the
 * engine happens to take decided whether an identity leaked.  That is exactly
 * the reasoning that made gate 2 necessary.
 *
 * <p>{@link #stackText} is now the one function that produces that string, and
 * it applies three rules in order (protocol section 3.6 rule 1):
 *
 * <ol>
 *   <li><b>Gate.</b> If the source card's identity is concealed from the viewer
 *   -- the same predicate {@link #card} uses, factored out as
 *   {@link #identityConcealed} -- the text is {@code ""}.  The client labels the
 *   absence; the wire carries nothing.</li>
 *   <li><b>Sweep.</b> If the raw text mentions {@code (<id>)} for an id this
 *   very frame conceals, the text is {@code ""}.  The gate alone is <em>not</em>
 *   sufficient, which is the second thing this design had assumed and got
 *   wrong: a trigger's {@code getSourceCard()} can be a last-known-information
 *   view of the card as it was when the trigger fired -- face up, in the
 *   graveyard -- while the live card of that id is already back on the
 *   battlefield face down, and that LKI view passes both of Forge's gates.  The
 *   id is what makes a concealed card identifiable, so the id is what is
 *   tested, against this frame's own answer.  This is what makes the invariant
 *   structural rather than a hope about Forge's phrasing.</li>
 *   <li><b>Strip.</b> Forge appends an engine-debug annotation of the shape
 *   {@code " [Zone Changer: Ashcloud Phoenix (75)]"} --
 *   {@code Trigger.getImportantStackObjects}, whose payload is
 *   {@code Card.toString()}, i.e. {@code name (id)}.  Nothing in the client
 *   consumes it, so it is removed from whatever survived the first two
 *   rules.</li>
 * </ol>
 *
 * <h2>The third path: notices</h2>
 *
 * {@code IGuiGame.message(message, title)} and {@code showErrorDialog} are
 * engine strings too, and they reach the wire as a {@code notice} (protocol
 * section 6).  {@code PlayerControllerHuman.notifyOfValue} passes
 * {@code CardView.get(sa.getHostCard()).toString()} as the <em>title</em> --
 * Forge's own {@code name (id)} join -- so a notice can name a card the very
 * same frame concealed, and one measurably did:
 * {@code {"level":"info","title":"Thriving Isle (49)","text":"Forge AI picked
 * White"}} while card 49 was a five-key stub in the opponent's hand.  Rule 2
 * above is the half that applies (there is no source card to gate on and no
 * annotation to strip), so it is factored out as {@link #sweepText} and
 * {@link WireGuiGame} calls it on both strings of every notice, against the
 * concealed-id set of the last frame.  That is what makes invariant 4's
 * "exactly one function that puts an engine string on the wire" true of the
 * <em>rule</em> rather than of one call site: {@link #stackText} and
 * {@link #sweepText} are the same sweep, and nothing else may emit an engine
 * string ungated.
 *
 * <p><b>Libraries carry a count and the revealed subset</b> (protocol section
 * 3.4).  {@code library.cards} holds only those library cards for which
 * {@code canBeShownTo(viewer)} is already true and <b>never</b> a redacted stub:
 * a continuous {@code MayLookAt$} static -- Future Sight, Bolas's Citadel,
 * Experimental Frenzy, Oracle of Mul Daya -- turns the top card of a library
 * visible through {@code Card.addMayLookAt} with <em>no blocking call</em> ever
 * firing, so there is no {@code ask} for it to ride on and "the library is a
 * bare count" made it invisible forever.  {@code count} stays the full size, so
 * {@code cards.length <= count} and the difference is what the viewer may not
 * see.
 */
public final class Snap {

    private Snap() { }

    /** The six mana-pool keys the protocol guarantees are always present. */
    private static final String[] MANA_KEYS = {"W", "U", "B", "R", "G", "C"};
    private static final byte[] MANA_COLORS = {
        MagicColor.WHITE, MagicColor.BLUE, MagicColor.BLACK,
        MagicColor.RED, MagicColor.GREEN, MagicColor.COLORLESS,
    };

    /** Poison is broken out of {@code counters} into its own field; the UI always shows it. */
    private static final String POISON = "POISON";

    // ==================================================================
    // Entry points
    // ==================================================================

    /**
     * How many events were dropped because the engine gave us no id for a field
     * the protocol declares non-null (protocol section 3.6, "missing ids").
     * Reported by {@code RecordMatch}'s summary so the count is visible rather
     * than silent.
     */
    private static final java.util.concurrent.atomic.AtomicLong INCOMPLETE_EVENTS =
            new java.util.concurrent.atomic.AtomicLong();

    /** @return how many events have been dropped for a missing required id. */
    public static long incompleteEventsDropped() {
        return INCOMPLETE_EVENTS.get();
    }

    /**
     * Card ids already reported as {@code UNZONED}, so the warning fires once
     * per card rather than once per frame (report 06 S5).
     *
     * <p>{@code CardView.canBeShownTo} opens with
     * {@code if (zone == null) { return true; } //cards outside any zone are
     * visible to all} -- it is <b>fail-open</b>.  Every card this function
     * serialises was found by iterating a zone, so a null {@code ZoneType}
     * property means the view graph disagrees with the zone we walked, and that
     * is worth a line in the log even though {@link #concealedByZoneHint} has
     * already made the redaction decision without consulting it.
     */
    private static final Set<Integer> UNZONED_SEEN = java.util.Collections.synchronizedSet(new HashSet<>());

    /** @return how many distinct cards were serialised with no {@code ZoneType}. */
    public static int unzonedCards() {
        return UNZONED_SEEN.size();
    }

    /**
     * Legitimate reveals already reported, keyed {@code id@zone}, so the line
     * fires once per card per zone instead of once per frame (report 06 W6).
     */
    private static final Set<String> REVEAL_SEEN = java.util.Collections.synchronizedSet(new HashSet<>());

    /**
     * How many distinct {@code REVEAL <id> <zone> <owner>} lines this process
     * has written -- a full card emitted for a hidden zone (Forge's own
     * {@code ZoneType.isHidden()}) that the viewer does not own.
     *
     * <p>Report 06 W6: over ten games this log is the ground truth for whether
     * the reveal surface behaves as the audit claims.  A reveal is <b>not</b> a
     * leak -- {@code canBeShownTo} said yes, because a search, a
     * {@code DelayedReveal} or a continuous {@code MayLookAt} static is running
     * -- but an unexplained one is, and the only way to tell is to count them.
     */
    public static int reveals() {
        return REVEAL_SEEN.size();
    }

    /**
     * Report 06 W6.  Called from {@link #card}'s full branch only, i.e. after
     * every gate has already said yes.
     *
     * <p>A card with <b>no</b> {@code ZoneType} counts as a reveal rather than
     * being skipped: the zone is exactly what {@code canBeShownTo} is fail-open
     * about (CardView.java:625-626), so an unzoned card emitted in full is the
     * one case most worth a line in the log.  It used to return early here, so
     * the live paths for an unzoned view -- an LKI copy, {@code getCardForUi},
     * an ask option built from a list rather than from a zone walk -- were
     * invisible to the counter that exists to watch them.
     */
    private static void reveal(final CardView cv, final String zone, final Integer owner,
                               final PlayerView viewer) {
        final ZoneType zt = cv.getZone();
        // ZoneType.isHidden() is Forge's own answer for "a zone whose contents
        // are secret": library, hand, sideboard.  A public zone is not a reveal;
        // a zone we do not know is.
        if (zt != null && !zt.isHidden()) {
            return;
        }
        if (viewer != null && owner != null && owner.intValue() == viewer.getId()) {
            return;                            // your own hand is not a reveal
        }
        if (REVEAL_SEEN.add(cv.getId() + "@" + zone) && REVEAL_SEEN.size() <= 200) {
            System.err.println("REVEAL " + cv.getId() + " " + zone + " " + owner);
        }
    }

    /**
     * A full redacted snapshot carrying the event batch it reflects.
     *
     * @param gameId the log/session id, or null to omit
     * @param game   the live game view
     * @param viewer the seat this snapshot is redacted for
     * @param events the {@code GameEventForwarder} batch this snapshot already
     *               reflects, mapped per protocol section 3.6; null for none
     */
    /**
     * The per-seat comfort state a snapshot carries and the view graph does not
     * hold (<b>M6</b>; report 11 sections 3, 4, 5 and 7, protocol amendments
     * M32, M34, M35, M36).
     *
     * <p>It is an interface rather than four more parameters because every one
     * of its answers lives in {@link WireGuiGame} -- the phase-stop map, the
     * yield-handle table, the seat's own controller -- and {@code Snap} is a
     * pure serialiser that must not reach for a controller or a
     * {@code HostedMatch}.  <b>Every method is called on the game thread</b>,
     * inside {@link #state}, so an implementation may read the controller and
     * the rules engine and must not block.
     *
     * <p>A recorder with no seat passes {@code null} and the fields are
     * <b>omitted</b>: an AI-vs-AI {@code RecordMatch} log has no phase stops, no
     * undo and no yields to report, and writing empty ones would invent state
     * that does not exist.  Protocol section 3.1 declares them optional for
     * exactly that reason.
     */
    public interface Comfort {
        /**
         * {@code PhaseType} names at which the game stops while this player is
         * the <b>turn player</b> -- protocol section 3.1's
         * {@code players[].phaseStops.own}.
         */
        List<String> stopsOnTurnOf(int playerId);

        /** The same while <b>anybody else</b> is the turn player ({@code .opp}). */
        List<String> stopsOffTurnOf(int playerId);

        /** Raw JSON for {@code state.yield}, or null for "no yield running". */
        String yieldJson();

        /** Raw JSON for {@code state.undo}; never null once a seat exists. */
        String undoJson();

        /**
         * The <b>opaque, bridge-minted</b> handle for this stack item, or null.
         * Never {@code StackItemView.getKey()}, which is a card name plus an id
         * plus its rules text (report 11 section 5.2).
         */
        String yieldHandle(StackItemView si);

        /** {@code "yes"}, {@code "no"} or null -- the standing answer for this item. */
        String yieldMode(StackItemView si);
    }

    /** The four-argument form: no seat, therefore no comfort fields (RecordMatch). */
    public static String state(final String gameId, final GameView game, final PlayerView viewer,
                               final List<GameEvent> events) {
        return state(gameId, game, viewer, events, null);
    }

    public static String state(final String gameId, final GameView game, final PlayerView viewer,
                               final List<GameEvent> events, final Comfort comfort) {
        assertGameThread("Snap.state");
        if (game == null) {
            throw new IllegalArgumentException("game view is null");
        }
        // Report 06 S6.  CardView.canBeShownTo(null) returns FALSE
        // (CardView.java:623, fail-closed), so a null viewer would not crash:
        // it would produce a perfectly well-formed snapshot in which every card
        // in the game, the viewer's own hand included, is a redacted stub.  That
        // turns a configuration bug into an unplayable game with no error, which
        // is the hardest kind to diagnose.  Fail here instead.
        if (viewer == null) {
            throw new IllegalArgumentException(
                "viewer is null -- every redaction decision in a snapshot is made against a seat, "
                + "and canBeShownTo(null) is false for every card, so a null viewer silently "
                + "redacts the whole game instead of failing");
        }
        // Protocol 3.1: gameId is non-null.  A state body that cannot be
        // attributed to a game is not a state body; there used to be a 2-arg
        // overload that produced one, and it was deleted for exactly this
        // reason.
        if (gameId == null || gameId.isEmpty()) {
            throw new IllegalArgumentException(
                "gameId is required -- a state body without a gameId cannot be attributed to a game");
        }
        final JsonOut o = new JsonOut();
        o.obj();
        o.n("gameId", gameId);

        final int turn = game.getTurn();
        o.n("turn", turn);
        // Protocol 3.1: turn counts PLAYER turns; round = ceil(turn / 2).
        // Forge's own game log calls a 17-turn game "Turn 9".
        o.n("round", (turn + 1) / 2);
        o.n("phase", game.getPhase() == null ? null : game.getPhase().name());

        final PlayerView active = game.getPlayerTurn();
        o.nInt("activePlayer", active == null ? null : Integer.valueOf(active.getId()));

        final List<PlayerView> players = players(game);
        final List<StackItemView> stack = stackBottomFirst(game);
        // Every card id this frame conceals, computed BEFORE anything is
        // written, because the text rules below need the whole frame's answer
        // and `stack[].text` is emitted before `stackCards`.
        final Set<Integer> concealed = concealedIds(players, stack, viewer);

        PlayerView priority = null;
        for (final PlayerView p : players) {
            if (p.getHasPriority()) {
                priority = p;
                break;
            }
        }
        o.nInt("priority", priority == null ? null : Integer.valueOf(priority.getId()));

        if (game.isGameOver()) {
            o.key("gameOver");
            gameOverBody(o, game, players);
        } else {
            o.nNull("gameOver");
        }

        o.key("players").arr();
        for (final PlayerView p : players) {
            player(o, p, viewer, comfort);
        }
        o.end();

        o.key("stack").arr();
        for (final StackItemView si : stack) {
            stackItem(o, si, viewer, concealed, comfort);
        }
        o.end();

        // Protocol 3.3: the source card of every stack item, so `stack[].text`
        // is not the only thing a renderer has for the card that is currently
        // resolving.  ZoneType.Stack is not one of the six zones a player
        // carries, so without this a `stack[].sourceCardId` resolves against
        // nothing.  Same single redaction gate -- card() is still the only
        // function in the bridge that serialises a CardView.
        o.key("stackCards").arr();
        final Set<Integer> seenStackCards = new HashSet<>();
        for (final StackItemView si : stack) {
            final CardView src = si.getSourceCard();
            // An activated ability's source is usually still on the
            // battlefield, so it appears both here and in that zone; a spell's
            // source is in ZoneType.Stack and appears only here.  Distinct ids
            // only: two stack items from one card emit one card.
            if (src != null && seenStackCards.add(Integer.valueOf(src.getId()))) {
                card(o, src, viewer, "stack", si.getActivatingPlayer());
            }
        }
        o.end();

        final CombatView combat = game.getCombat();
        if (combat == null) {
            o.nNull("combat");
        } else {
            o.key("combat").obj().key("bands").arr();
            bands(o, combat);
            o.end().end();
        }

        // M6, protocol amendments M34 and M35.  Both are server-owned answers to
        // "what is the engine already doing for me" -- the active pass-to and
        // the undo depth -- and both are omitted, not faked, when there is no
        // seat to answer for (an AI-vs-AI recording).
        if (comfort != null) {
            final String yield = comfort.yieldJson();
            o.key("yield");
            if (yield == null) {
                o.vNull();
            } else {
                o.raw(yield);
            }
            final String undo = comfort.undoJson();
            o.key("undo");
            if (undo == null) {
                o.vNull();
            } else {
                o.raw(undo);
            }
        }

        o.key("events").arr();
        if (events != null) {
            for (final GameEvent ev : events) {
                event(o, ev, players, viewer, concealed);
            }
        }
        o.end();

        return o.end().done();
    }

    /**
     * The {@code over} body of protocol section 7, also used verbatim as
     * {@code state.gameOver}: {@code {winner, reason, matchOver}}.
     */
    public static String over(final GameView game) {
        assertGameThread("Snap.over");
        final JsonOut o = new JsonOut();
        gameOverBody(o, game, players(game));
        return o.done();
    }

    /** Throw unless we are on the Forge game thread. */
    public static void assertGameThread(final String what) {
        if (!ThreadUtil.isGameThread()) {
            throw new IllegalStateException(
                what + " must run on the Forge game thread (ThreadUtil.isGameThread(), i.e. a thread "
                + "whose name starts with \"Game\"); this is \"" + Thread.currentThread().getName()
                + "\". The Tracker is not thread safe and walking the view graph off the game thread "
                + "corrupts it silently.");
        }
    }

    // ==================================================================
    // Players and zones
    // ==================================================================

    private static List<PlayerView> players(final GameView game) {
        final List<PlayerView> out = new ArrayList<>(4);
        if (game.getPlayers() != null) {
            for (final PlayerView p : game.getPlayers()) {
                out.add(p);
            }
        }
        return out;
    }

    private static void player(final JsonOut o, final PlayerView p, final PlayerView viewer,
                               final Comfort comfort) {
        o.obj();
        o.n("id", p.getId());
        o.n("name", p.getName());
        o.n("isAi", p.isAI());
        o.n("life", p.getLife());

        int poison = 0;
        final Multiset<CounterType> counters = p.getCounters();
        if (counters != null) {
            for (final Multiset.Entry<CounterType> e : counters.entrySet()) {
                if (e.getElement() != null && POISON.equalsIgnoreCase(e.getElement().getName())) {
                    poison = e.getCount();
                }
            }
        }
        o.n("poison", poison);

        o.key("counters").obj();
        if (counters != null) {
            for (final Multiset.Entry<CounterType> e : counters.entrySet()) {
                final CounterType t = e.getElement();
                if (t == null || POISON.equalsIgnoreCase(t.getName())) {
                    continue;   // poison is its own field, above
                }
                o.n(t.getName(), e.getCount());
            }
        }
        o.end();

        // All six keys always, zeros included, so the renderer never branches
        // on absence (protocol 3.1).
        o.key("manaPool").obj();
        for (int i = 0; i < MANA_KEYS.length; i++) {
            o.n(MANA_KEYS[i], p.getMana(MANA_COLORS[i]));
        }
        o.end();

        // M6, protocol amendment M32.  TWO sets, because a phase stop in Forge
        // is a per-(turn player, phase) bit: "stop at MAIN1 on my turn" and
        // "stop at MAIN1 on the AI's turn" are different switches, seeded from
        // different preference arrays (FPref.PHASES_HUMAN / PHASES_AI).  A flat
        // array cannot say which, and the client must never derive one from the
        // other.
        if (comfort != null) {
            o.key("phaseStops").obj();
            o.key("own").arr();
            for (final String s : comfort.stopsOnTurnOf(p.getId())) {
                o.v(s);
            }
            o.end();
            o.key("opp").arr();
            for (final String s : comfort.stopsOffTurnOf(p.getId())) {
                o.v(s);
            }
            o.end();
            o.end();
        }

        o.key("zones").obj();
        zone(o, "hand", p.getHand(), viewer, p);
        zone(o, "battlefield", p.getBattlefield(), viewer, p);
        zone(o, "graveyard", p.getGraveyard(), viewer, p);
        zone(o, "exile", p.getExile(), viewer, p);
        zone(o, "command", p.getCommand(), viewer, p);
        library(o, p, viewer);
        o.end();

        o.end();
    }

    private static void zone(final JsonOut o, final String name, final Iterable<CardView> cards,
                             final PlayerView viewer, final PlayerView zoneOwner) {
        int count = 0;
        final List<CardView> list = new ArrayList<>();
        if (cards != null) {
            for (final CardView cv : cards) {
                list.add(cv);
                count++;
            }
        }
        o.key(name).obj();
        o.n("count", count);
        o.key("cards").arr();
        for (final CardView cv : list) {
            card(o, cv, viewer, name, zoneOwner);
        }
        o.end();
        o.end();
    }

    /**
     * {@code library: {count, cards}} -- protocol 3.4.
     *
     * <p>{@code count} is the <b>full</b> size of the library; {@code cards}
     * holds only the cards the viewer may already see, and <b>never</b> a
     * redacted stub.  The distinction matters: a stub in a library would leak
     * the library's order, which is information nobody at the table has, while a
     * missing entry leaks nothing at all.
     *
     * <p>The cards that appear here are the ones a continuous {@code MayLookAt$}
     * static has revealed -- Future Sight, Bolas's Citadel, Experimental Frenzy,
     * Vizier of the Menagerie, Oracle of Mul Daya, Melek, and Hidden Agenda's
     * face-down command-zone card.  None of them blocks, so none of them has an
     * {@code ask} to ride on, which is why the previous "a library is a bare
     * count" rule made them permanently invisible.
     *
     * <p>The filter is <em>the same expression</em> {@link #card} tests for its
     * redacted branch ({@link #hiddenByGates}), not an approximation of it, so
     * it is structurally impossible for a card to pass this filter and then be
     * emitted as a stub.  Walking the whole library and discarding almost all of
     * it is the only correct way to find these: "just check the top card" misses
     * Bolas's Citadel's second card and every multi-card reveal.
     */
    private static void library(final JsonOut o, final PlayerView p, final PlayerView viewer) {
        o.key("library").obj();
        o.n("count", p.getZoneSize(ZoneType.Library));
        o.key("cards").arr();
        final Iterable<CardView> lib = p.getLibrary();
        if (lib != null) {
            for (final CardView cv : lib) {
                if (cv != null && !hiddenByGates(cv, viewer, "library", p)) {
                    card(o, cv, viewer, "library", p);
                }
            }
        }
        o.end();
        o.end();
    }

    // ==================================================================
    // M2 entry points -- report 06 S8, "one function, two entry points"
    //
    // WireGuiGame's IGuiGame signatures hand it CardViews (an ask option list, a
    // DelayedReveal, a focus card, a blocker in an assign_damage body).  Every
    // one of them comes back through here, so there is still exactly ONE
    // function that serialises a card and exactly ONE that puts a card's name in
    // a label.  tools/lint-bridge.sh keeps it that way mechanically: no file but
    // this one and the IGuiGame implementations may even NAME the type.
    // ==================================================================

    /**
     * Serialise one card that did not come from a zone walk -- an {@code ask}
     * option, {@code input.focusCard}, a {@code DelayedReveal} entry.
     *
     * <p>Game thread only, like every other view walk.  The zone and owner hints
     * come from the card itself because there is no caller-side walk to know
     * better; gate 1 ({@code canBeShownTo}) and gate 2
     * ({@code canFaceDownBeShownTo}) are unchanged and are what actually decide.
     */
    public static void card(final JsonOut o, final CardView cv, final PlayerView viewer) {
        assertGameThread("Snap.card");
        final ZoneType zt = cv.getZone();
        card(o, cv, viewer, zt == null ? "unknown" : lower(zt.name()), cv.getOwner());
    }

    /**
     * The one gated <b>label</b> for a card: report 06 S8, and the leak that
     * will actually happen otherwise.
     *
     * <p>Forge's own dialogs label a generic {@code T} with
     * {@code String.valueOf(t)}, and {@code CardView.toString()} is
     * {@code "<zone> <name> (<id>)"} for a card in <em>any</em> zone, an
     * opponent's hand included.  So every option label in {@link WireGuiGame}
     * comes from here instead.
     *
     * @return {@code "???"} when the viewer may not see the card at all,
     *         {@code "Face-down card"} when they may see it but not its face,
     *         the card's name otherwise
     */
    public static String label(final CardView cv, final PlayerView viewer) {
        assertGameThread("Snap.label");
        if (cv == null) {
            return "";
        }
        final ZoneType zt = cv.getZone();
        final String zoneHint = zt == null ? "unknown" : lower(zt.name());
        if (hiddenByGates(cv, viewer, zoneHint, cv.getOwner())) {
            return "???";
        }
        if (cv.isFaceDown()) {
            // Even when the viewer MAY see the face (their own morph), the
            // label stays generic: the name lives in the card object's `alt`
            // block, which is the one place getAlternateState() may be read.
            return "Face-down card";
        }
        final String name = nz(cv.getName());
        return name.isEmpty() ? "???" : name;
    }

    /**
     * <b>May this viewer know which card this is?</b>  All three gates, as one
     * predicate, for callers that must decide whether a <em>string</em> may name
     * it -- a {@code SpellAbilityView.getDescription()} on an ability menu, for
     * instance, which is built from the host card's name.
     */
    public static boolean concealed(final CardView cv, final PlayerView viewer) {
        assertGameThread("Snap.concealed");
        if (cv == null) {
            return true;
        }
        final ZoneType zt = cv.getZone();
        return identityConcealed(cv, viewer, zt == null ? "unknown" : lower(zt.name()), cv.getOwner());
    }

    /**
     * Remaining toughness of a blocker, for {@code assign_damage.targets[].lethal}
     * (protocol section 5.3).  Game thread; {@code null} when the card has no
     * printed toughness.
     */
    public static Integer lethal(final CardView cv) {
        assertGameThread("Snap.lethal");
        final CardView.CardStateView st = cv == null ? null : cv.getCurrentState();
        if (st == null || !(st.isCreature() || st.hasPrintedPT())) {
            return null;
        }
        return Integer.valueOf(st.getToughness() - cv.getDamage());
    }

    /**
     * Every card the snapshot can see, by id -- the map an {@code act} uses to
     * turn a {@code cardId} back into the {@code CardView}
     * {@code IGameController.selectCard} wants.
     *
     * <p>Built here, on the <b>game thread</b>, and cached by the caller,
     * because an act is dispatched on the EDT where walking the view graph is
     * forbidden (report 07 R1).  The client only ever echoes an id; this is the
     * only place an id becomes an object again.
     */
    public static Map<Integer, CardView> cardIndex(final GameView game) {
        assertGameThread("Snap.cardIndex");
        final Map<Integer, CardView> out = new java.util.HashMap<>(256);
        for (final PlayerView p : players(game)) {
            indexZone(out, p.getHand());
            indexZone(out, p.getBattlefield());
            indexZone(out, p.getGraveyard());
            indexZone(out, p.getExile());
            indexZone(out, p.getCommand());
            indexZone(out, p.getLibrary());
        }
        for (final StackItemView si : stackBottomFirst(game)) {
            final CardView src = si.getSourceCard();
            if (src != null) {
                out.putIfAbsent(Integer.valueOf(src.getId()), src);
            }
        }
        return out;
    }

    private static void indexZone(final Map<Integer, CardView> out, final Iterable<CardView> cards) {
        if (cards == null) {
            return;
        }
        for (final CardView cv : cards) {
            if (cv != null) {
                out.putIfAbsent(Integer.valueOf(cv.getId()), cv);
            }
        }
    }

    /** The game's players, in engine order.  Game thread (it is a view walk). */
    public static List<PlayerView> playerList(final GameView game) {
        assertGameThread("Snap.playerList");
        return players(game);
    }

    // ==================================================================
    // THE card function.  Nothing else in the bridge serialises a CardView.
    // ==================================================================

    /**
     * Serialise one card for one viewer.
     *
     * <p><b>Two gates, both of them Forge's own.</b>
     *
     * <ol>
     *   <li>{@code CardView.canBeShownTo}
     *   (forge-game/src/main/java/forge/game/card/CardView.java:622) encodes the
     *   whole rules answer for <em>whether the card is visible at all</em>,
     *   {@code PlayerMayLook} temporary reveals included.  If it says no, the
     *   card becomes five keys and nothing else (protocol 3.3).</li>
     *
     *   <li>{@code CardView.canFaceDownBeShownTo} (CardView.java:688-704) is a
     *   <em>separate</em> gate for <em>identity</em>, and it is the one Forge
     *   itself uses for a face-down permanent
     *   ({@code AbstractGuiGame.mayFlip}, {@code AiBlockController}).  It
     *   matters because gate 1 returns {@code true} <b>unconditionally</b> for
     *   Battlefield, Stack, Graveyard and Command -- face down or not -- so a
     *   face-down permanent passes gate 1.  It ends
     *   {@code isInZone(Battlefield, Stack, Sideboard) && getController().equals(viewer)},
     *   i.e. the controller of a face-down permanent may see its face and nobody
     *   else may -- and it is the gate on the {@code alt} block, the only place
     *   that face can reach the wire.</li>
     * </ol>
     *
     * <p><b>Gate 0, ours.</b> {@code canBeShownTo} opens with
     * {@code ZoneType zone = getZone(); if (zone == null) return true;} --
     * "cards outside any zone are visible to all".  But the caller here already
     * knows the zone, because {@link #zone} found the card by iterating
     * {@code p.getHand()} / {@code p.getBattlefield()} / ... , so a
     * {@code CardView} sitting in an opponent's hand whose {@code ZoneType}
     * property happened to be unset would take the full-fields branch and be
     * emitted with its name next to {@code zone: "hand"} from the hint.  Never
     * observed -- the property is set in practice -- but a redaction decision
     * must not depend on which property Forge happened to populate when the
     * caller already knows the answer, which is the same argument that made
     * gate 2 necessary.  See {@link #concealedByZoneHint}.
     *
     * <p><b>Face-down cards.</b>  A face-down permanent's <em>state</em> is
     * public even though its identity is not -- everyone can see that it is
     * tapped, that it is attacking, that it has two +1/+1 counters -- so it
     * takes the ordinary full-fields branch, reading {@code getCurrentState()}
     * and nothing else.  For a face-down card that state is
     * {@code CardUtil.getFaceDownCharacteristic} (CardUtil.java:192-210): no
     * name, set code {@code "???"}, a 2/2 Creature.  Three things are forced
     * rather than left to it, so the guarantee is structural instead of an
     * accident of which {@code CardState} Forge selected:
     *
     * <ul>
     *   <li>{@code name} is {@code ""} and {@code manaCost} is {@code null} for
     *   <em>every</em> face-down card, viewer's own included -- the identity
     *   lives in {@code alt} or nowhere;</li>
     *   <li>{@code alt} ({@code getAlternateState()}: the real name, cost, types
     *   and P/T) is emitted only when
     *   {@code cv.isFaceDown() && cv.canFaceDownBeShownTo(viewer)} -- i.e. "you
     *   may look at face-down permanents you control", and this is the ONE call
     *   to {@code getAlternateState()} in the bridge, which
     *   {@code tools/lint-bridge.sh} enforces;</li>
     *   <li>{@code types}, {@code power} and {@code toughness} are suppressed
     *   for a face-down card <b>outside Battlefield and Stack</b>, because the
     *   2/2 Creature is a property of the face-down state object, not a rules
     *   fact about a card in exile; Forge's own
     *   {@code CardDetailUtil.formatCardType} / {@code formatPrimaryCharacteristic}
     *   (CardDetailUtil.java:162-180) make the same distinction.</li>
     * </ul>
     *
     * @param zoneHint  the zone we found this card in, used only when
     *                  {@code cv.getZone()} is null, so {@code zone} is never null
     * @param ownerHint the player whose zone we found it in, used only when the
     *                  card has neither controller nor owner.  For a player zone
     *                  this is that player and is non-null, so {@code controller}
     *                  and {@code owner} are always numbers there; for
     *                  {@code stackCards} it is {@code si.getActivatingPlayer()},
     *                  which Forge declares nullable (it is why
     *                  {@code stack[].controller} is nullable in protocol 3.1),
     *                  so a stack card whose {@code CardView} carries neither a
     *                  controller nor an owner emits {@code null} for both.
     *                  Protocol 3.2 declares them nullable for exactly that
     *                  path.  Never observed in nine recordings.
     */
    private static void card(final JsonOut o, final CardView cv, final PlayerView viewer,
                             final String zoneHint, final PlayerView ownerHint) {
        final ZoneType zt = cv.getZone();
        if (zt == null) {
            unzoned(cv);
        }
        // PLAN.md "M1 follow-ups": `zone` is declared non-null by protocol.ts
        // and by tools/check-redaction.mjs while protocol.md tolerated a null on
        // the redacted stub.  One end has to win, and the cheapest answer is a
        // non-null fallback here: a card with no ZoneType whose caller had no
        // hint either -- an LKI copy, a synthetic pile header, an ask option
        // built from a list rather than from a zone walk -- is "unknown", which
        // every reader can render and nobody has to test for absence.
        final String zone = zt != null ? lower(zt.name())
                : zoneHint != null ? zoneHint : "unknown";
        final PlayerView controllerView =
                cv.getController() != null ? cv.getController()
                        : cv.getOwner() != null ? cv.getOwner() : ownerHint;
        final PlayerView ownerView =
                cv.getOwner() != null ? cv.getOwner() : controllerView;
        final Integer controller = controllerView == null ? null : Integer.valueOf(controllerView.getId());
        final Integer owner = ownerView == null ? null : Integer.valueOf(ownerView.getId());

        if (hiddenByGates(cv, viewer, zoneHint, ownerHint)) {
            // EXACTLY five keys (protocol 3.3).  Nothing that identifies the
            // card, and nothing conditional: a sixth key here is a leak, and
            // tools/check-redaction.mjs asserts the key set rather than a
            // blacklist so that a new field cannot quietly join it.
            //
            // All three of zone, owner and controller tolerate null here and
            // only here: PlayerControllerHuman.chooseCardsPile builds a
            // synthetic header view, `new CardView(Integer.MIN_VALUE, null,
            // "-- Pile 1 (3 cards) --")`, whose tracker, zone, controller and
            // owner are all null (PlayerControllerHuman.java:2516-2530).  It has
            // to survive this branch rather than NPE inside it.
            o.obj()
             .n("id", cv.getId())
             .n("zone", zone)
             .nInt("owner", owner)
             .nInt("controller", controller)
             .n("hidden", true)
             .end();
            return;
        }

        // Every gate has said yes: this is a full card.  If it lives in a zone
        // Forge itself calls hidden and the viewer does not own it, that is a
        // legitimate reveal and report 06 W6 wants it on the record.
        reveal(cv, zone, owner, viewer);

        // Face down: the object is public, the face is not.  `faceVisible` is
        // the ONLY thing that lets the real card reach the wire, through `alt`.
        // (Not called mayFlip: tools/lint-bridge.sh bans that identifier
        // outright, because AbstractGuiGame.mayFlip is Forge's own renderer
        // gate and has fail-open branches we must never inherit.)
        final boolean faceDown = cv.isFaceDown();
        final boolean faceVisible = faceDown && cv.canFaceDownBeShownTo(viewer);
        // A face-down card in exile / a hand / the command zone has no public
        // body at all; the 2/2 Creature of CardUtil.getFaceDownCharacteristic is
        // an artifact of the state object, and Forge's own detail panel does not
        // show it outside play either (report 06 section 1.4).
        final boolean bodyPublic = !faceDown || "battlefield".equals(zone) || "stack".equals(zone);

        o.obj();
        o.n("id", cv.getId());
        // Forced to "" for every face-down card rather than trusted to be "":
        // getCurrentState() of a face-down card IS the face-down characteristic
        // and its name is already "", but "impossible by construction" must not
        // rest on which CardState a getter happens to return.  The real name, if
        // this viewer may have it, is in `alt`.
        o.n("name", faceDown ? "" : nz(cv.getName()));

        final CardView.CardStateView st = cv.getCurrentState();
        if (st == null) {
            // Protocol 3.2: `name` and `types` are ALWAYS strings, "" when Forge
            // has nothing, so a renderer never branches on their absence.  `name`
            // is already handled that way two lines above via nz(); `types` used
            // to be null here, which protocol.ts (`types: string`) forbids and
            // this repo's own tools/check-redaction.mjs would have rejected.
            // Never observed -- getCurrentState() is a plain property read and is
            // populated in practice -- but one defensive line must not quietly
            // opt out of an invariant the same function enforces for its
            // neighbour.  setCode stays nullable (protocol 3.2).
            //
            // Convention (c) in the class javadoc: this branch writes the SAME
            // key set, in the same order, as the one below it.
            o.nNull("setCode").nNull("manaCost").n("types", "")
             .nNull("power").nNull("toughness").nNull("loyalty");
            // M49: no state, no keywords -- the same key, empty (convention c).
            o.key("keywords").arr().end();
        } else {
            o.n("setCode", st.getSetCode());
            // Protocol 3.2: null for a card with no mana cost -- never an empty
            // string and never Forge's internal display string.  ManaCost.NO_COST
            // is non-null and its toString() is the literal "no cost", which is
            // a label for a Swing table cell, not a value for a wire format.
            // Every land and every token takes this branch.  A face-down card
            // has no cost the table can see either.
            final ManaCost mc = st.getManaCost();
            o.n("manaCost", faceDown || mc == null || mc.isNoCost() ? null : mc.toString());
            o.n("types", bodyPublic ? nz(st.getUntranslatedType()) : "");
            // 2.0.14's CardStateView returns ints for P/T (a "*" has already
            // been resolved to a number), but the protocol keeps them strings
            // because "*" and "1+*" are real values elsewhere in Magic.
            if (bodyPublic && (st.isCreature() || st.hasPrintedPT())) {
                o.n("power", Integer.toString(st.getPower()));
                o.n("toughness", Integer.toString(st.getToughness()));
            } else {
                o.nNull("power").nNull("toughness");
            }
            // CardStateView.getLoyalty() returns "0" for everything that is
            // not a planeswalker, which is noise, not a value.  The protocol
            // wants null there.
            final String loyalty = st.getLoyalty();
            o.n("loyalty", !faceDown && st.isPlaneswalker() && !empty(loyalty) ? loyalty : null);
            // M49: a face-down card's keywords are withheld like its name (see keywords()).
            keywords(o, faceDown ? null : st.getKeywords());
        }

        o.n("damage", cv.getDamage());

        counters(o, cv.getCounters());

        o.n("tapped", cv.isTapped());
        o.n("sick", cv.isSick());
        o.n("attacking", cv.isAttacking());
        o.n("blocking", cv.isBlocking());
        o.n("faceDown", faceDown);
        // CardView.isToken() -- a token has an id and a board presence but no
        // printing, so the art resolver must not look it up and the client may
        // want to draw it differently (protocol 3.2).  isTokenCard() is a
        // different question (a card that makes tokens) and is not emitted.
        o.n("token", cv.isToken());

        // THE alt block.  The one call to getAlternateState() in the bridge:
        // tools/lint-bridge.sh allows exactly one occurrence, here, and rejects
        // the identifier everywhere else.
        o.key("alt");
        final CardView.CardStateView alt = faceVisible ? cv.getAlternateState() : null;
        if (alt == null) {
            o.vNull();
        } else {
            o.obj();
            o.n("name", nz(alt.getName()));
            final ManaCost amc = alt.getManaCost();
            o.n("manaCost", amc == null || amc.isNoCost() ? null : amc.toString());
            o.n("types", nz(alt.getUntranslatedType()));
            if (alt.isCreature() || alt.hasPrintedPT()) {
                o.n("power", Integer.toString(alt.getPower()));
                o.n("toughness", Integer.toString(alt.getToughness()));
            } else {
                o.nNull("power").nNull("toughness");
            }
            o.end();
        }

        final CardView attachedTo = cv.getAttachedTo();
        o.nInt("attachedToId", attachedTo == null ? null : Integer.valueOf(attachedTo.getId()));

        o.key("attachmentIds").arr();
        final List<CardView> attachments = cv.getAttachedCards();
        if (attachments != null) {
            for (final CardView a : attachments) {
                if (a != null) {
                    o.v(a.getId());
                }
            }
        }
        o.end();

        o.nInt("controller", controller);
        o.nInt("owner", owner);
        o.n("zone", zone);

        // Always empty in M1.  The playable-ability list is not a property of
        // CardView at all: Forge asks the GUI for it through
        // IGuiGame.getAbilityToPlay(card, abilities, trigger), which only fires
        // for a human seat.  An AI-vs-AI recording has none, and a spectator
        // may play nothing, so [] is the correct answer here, not a stub.
        // WireGuiGame (M2) fills it from that call.
        o.key("abilities").arr().end();

        o.end();
    }

    // ==================================================================
    // Stack
    // ==================================================================

    /**
     * Forge's {@code MagicStack} is a {@code Deque} that {@code addFirst}s, so
     * its iterator yields the <b>top</b> first.  The protocol (section 3.1)
     * orders the stack bottom first, with the last element resolving next, so
     * the order is reversed here rather than in the reducer.
     */
    private static List<StackItemView> stackBottomFirst(final GameView game) {
        final List<StackItemView> out = new ArrayList<>();
        if (game.getStack() != null) {
            for (final StackItemView si : game.getStack()) {
                out.add(si);
            }
        }
        java.util.Collections.reverse(out);
        return out;
    }

    /**
     * One stack item.  Unlike an event, a stack item can never be dropped for a
     * missing id -- dropping it would misreport the board -- so
     * {@code sourceCardId} and {@code controller} are declared nullable in
     * protocol 3.1 and every reader guards them.  The card itself is in
     * {@code state.stackCards}.
     */
    private static void stackItem(final JsonOut o, final StackItemView si, final PlayerView viewer,
                                  final Set<Integer> concealed, final Comfort comfort) {
        o.obj();
        o.n("id", si.getId());
        o.nInt("sourceCardId", id(si.getSourceCard()));
        o.nInt("controller", pid(si.getActivatingPlayer()));
        // NOT "the same string Forge shows every player" -- that was an
        // assumption and it was false.  See stackText.
        o.n("text", stackText(si, viewer, concealed));
        o.key("targetCardIds").arr();
        if (si.getTargetCards() != null) {
            for (final CardView t : si.getTargetCards()) {
                if (t != null) {
                    o.v(t.getId());
                }
            }
        }
        o.end();
        o.key("targetPlayerIds").arr();
        if (si.getTargetPlayers() != null) {
            for (final PlayerView t : si.getTargetPlayers()) {
                if (t != null) {
                    o.v(t.getId());
                }
            }
        }
        o.end();
        // M6, protocol amendment M36.  `yieldKey` is an OPAQUE HANDLE minted by
        // WireGuiGame -- "y3", not StackItemView.getKey(), which is
        // CardView.toString() + ": " + the ability's text, i.e. a card name, an
        // id and its rules text (report 11 section 5.2).  This file never sees
        // the raw key: the handle table is the only thing that calls getKey(),
        // and tools/lint-bridge.sh fails a build where that stops being true.
        if (comfort != null) {
            final String handle = comfort.yieldHandle(si);
            o.key("yieldKey");
            if (handle == null) {
                o.vNull();
            } else {
                o.v(handle);
            }
            o.n("isAbility", si.isAbility());
            o.n("isOptionalTrigger", si.isOptionalTrigger());
            final String mode = comfort.yieldMode(si);
            o.key("yielded");
            if (mode == null) {
                o.vNull();
            } else {
                o.v(mode);
            }
        }
        o.end();
    }

    // ==================================================================
    // Stack text -- the ONE function that puts a Forge string on the wire
    // ==================================================================

    /**
     * Forge's engine-debug annotation, appended to a triggered ability's stack
     * description by {@code WrappedAbility.getStackDescription} as
     * {@code sb.append(" [").append(regtrig.getImportantStackObjects(this)).append("]")}
     * (forge-game/src/main/java/forge/game/trigger/WrappedAbility.java:201-206).
     * Its payload is a label plus {@code Card.toString()}, i.e. {@code name (id)}:
     *
     * <pre>
     *   " [Zone Changer: Ashcloud Phoenix (75)]"
     *   " [Attacker: Ant-Man's Air Force (23)]"
     *   " [Card: Super Suit (40), Activator: AI-Seat0, SpellAbility: Super Suit]"
     * </pre>
     *
     * Nothing in the client consumes it, and it is the one place a name and the
     * id needed to join it to a concealed card arrive together, so it is removed
     * from every text.  The character class forbids brackets, so the match
     * cannot run backwards past the {@code "(Targeting: [[...]])"} group Forge
     * puts earlier in the same string.
     */
    private static final Pattern ENGINE_ANNOTATION =
            Pattern.compile("\\s*\\[[^\\[\\]]*:[^\\[\\]]*\\]\\s*$");

    /** {@code Card.toString()} is {@code name (id)}; this finds the id half. */
    private static final Pattern CARD_REF = Pattern.compile("\\((\\d{1,9})\\)");

    /**
     * The text of one stack item, for one viewer -- gate, strip, sweep.  See the
     * class javadoc, "The second path: stack text", and protocol section 3.6
     * rule 1.
     *
     * @return the public description, or {@code ""} when this viewer may not
     *         have it.  Never null; the client labels the empty string.
     */
    private static String stackText(final StackItemView si, final PlayerView viewer,
                                    final Set<Integer> concealed) {
        final String raw = nz(si.getText());
        // 1. Gate -- the same predicate card() uses, on the same card.
        final CardView src = si.getSourceCard();
        if (src != null && identityConcealed(src, viewer, "stack", si.getActivatingPlayer())) {
            return "";
        }
        // 2. Sweep, on the RAW text, before anything is removed from it.  The
        //    gate is not sufficient on its own: a triggered ability's
        //    getSourceCard() can be a last-known-information snapshot of the
        //    card as it was when the trigger fired -- face UP, in the graveyard
        //    -- while the live card of the same id is already back on the
        //    battlefield face down.  Ashcloud Phoenix's own death trigger does
        //    exactly that, and its LKI view passes both of Forge's gates.  The
        //    id in the text is what makes the concealed card identifiable, so
        //    the id is what we test, against this frame's own answer.
        if (sweepText(raw, concealed).isEmpty()) {
            return "";
        }
        // 3. Strip the engine annotation from what survives.
        return ENGINE_ANNOTATION.matcher(raw).replaceAll("");
    }

    /**
     * <b>Rule 2 of {@link #stackText}, on its own, for the other strings the
     * engine hands us</b> -- {@code IGuiGame.message} / {@code showErrorDialog},
     * whose title is frequently {@code CardView.get(sa.getHostCard()).toString()},
     * i.e. Forge's own {@code name (id)} join
     * ({@code PlayerControllerHuman.notifyOfValue}).
     *
     * <p>Measured, before this existed: a {@code notice} frame carrying
     * {@code "title":"Thriving Isle (49)"} in a game whose very same snapshot
     * held card 49 as a five-key hidden stub in the opponent's hand.  That is
     * the {@code cast.text} leak of protocol section 3.6 rule 1 in a second
     * channel, and nothing was looking at it: {@code notice} bodies had no
     * gate, no shape check and no scan.
     *
     * <p>Ids, not names -- for the same three reasons rule 1 gives: names are
     * unbounded, localisable, and the id is what makes a concealed card
     * identifiable in the first place.  The whole string is blanked rather than
     * the {@code (id)} join alone, because a string that was <em>built</em> out
     * of a concealed card is not made safe by deleting the join.
     *
     * @param raw       the engine's string, or null
     * @param concealed the ids this frame conceals from the viewer -- from
     *                  {@link #concealedIds(GameView, PlayerView)}, captured on
     *                  the game thread
     * @return {@code raw}, or {@code ""} when it names a concealed id.  Never
     *         null.
     */
    public static String sweepText(final String raw, final Set<Integer> concealed) {
        final String s = nz(raw);
        return concealed != null && mentionsConcealedId(s, concealed) ? "" : s;
    }

    /** True if {@code text} contains {@code (<id>)} for an id this frame conceals. */
    private static boolean mentionsConcealedId(final String text, final Set<Integer> concealed) {
        if (text.isEmpty() || concealed.isEmpty()) {
            return false;
        }
        final Matcher m = CARD_REF.matcher(text);
        while (m.find()) {
            if (concealed.contains(Integer.valueOf(m.group(1)))) {
                return true;
            }
        }
        return false;
    }

    /**
     * The two gates of {@link #card}, plus gate 0, as one predicate: <b>may this
     * viewer know which card this is?</b>  Factored out so the card path and the
     * text path cannot disagree -- that they did is the bug this exists to
     * prevent.
     */
    private static boolean identityConcealed(final CardView cv, final PlayerView viewer,
                                             final String zoneHint, final PlayerView ownerHint) {
        return hiddenByGates(cv, viewer, zoneHint, ownerHint)
                || (cv.isFaceDown() && !cv.canFaceDownBeShownTo(viewer));
    }

    /**
     * Gates 0 and 1 as one predicate: <b>may this viewer see this card at
     * all?</b>  True means {@link #card} emits the five-key redacted stub.
     *
     * <p>Factored out because {@link #library} has to answer the same question
     * <em>before</em> calling {@link #card} -- protocol 3.4 says
     * {@code library.cards} never contains a stub -- and a filter that merely
     * approximated this expression would be a second redaction decision, which
     * is the one thing this design does not allow.
     */
    private static boolean hiddenByGates(final CardView cv, final PlayerView viewer,
                                         final String zoneHint, final PlayerView ownerHint) {
        return concealedByZoneHint(cv, viewer, zoneHint, ownerHint) || !cv.canBeShownTo(viewer);
    }

    /**
     * Report 06 S5: a {@code CardView} with no {@code ZoneType}, reported once
     * per card id.  Every card we serialise was found by iterating a zone, so a
     * null zone means the view graph disagrees with the walk -- an LKI copy, a
     * {@code getCardForUi} view, or one of
     * {@code PlayerControllerHuman.chooseCardsPile}'s synthetic pile headers.
     * The redaction decision does not depend on it ({@link #concealedByZoneHint}
     * is exactly the guard for this case), but it is a fact about the engine
     * worth a line rather than a silent fallback.
     */
    private static void unzoned(final CardView cv) {
        if (UNZONED_SEEN.add(Integer.valueOf(cv.getId())) && UNZONED_SEEN.size() <= 50) {
            System.err.println("UNZONED " + cv.getId()
                    + " -- serialised a CardView with no ZoneType; using the caller's zone hint");
        }
    }

    /**
     * Gate 0: the caller knows the zone, so a missing {@code ZoneType} property
     * must not open a concealed-by-default zone.  {@code canBeShownTo} answers
     * {@code true} for a {@code CardView} whose {@code getZone()} is null
     * ("cards outside any zone are visible to all", CardView.java:625-626); a
     * card we found by iterating an opponent's hand is not such a card.
     *
     * <p>The {@code "unknown"} arm is the same rule for the caller who has
     * <b>no</b> walk to know better: {@link #card(JsonOut, CardView, PlayerView)}
     * and {@link #label} derive their hint from {@code cv.getZone()} itself, so
     * a null zone there used to mean hint {@code "unknown"}, no match on the
     * two named zones, and a fall-through to gate 1 -- which is unconditionally
     * true for a zoneless card.  A card owned by somebody who is not the viewer
     * is concealed even when Forge cannot say where it is; protocol section 3.3
     * is explicit that a redaction decision must not depend on which property
     * Forge happened to populate.  A <b>null owner</b> deliberately stays
     * visible: {@code PlayerControllerHuman.chooseCardsPile}'s synthetic pile
     * headers ({@code new CardView(Integer.MIN_VALUE, null, "-- Pile 1 --")})
     * have no owner and no zone, and section 3.3 names them as cards that must
     * survive this branch.
     */
    private static boolean concealedByZoneHint(final CardView cv, final PlayerView viewer,
                                               final String zoneHint, final PlayerView ownerHint) {
        if (cv.getZone() != null) {
            return false;
        }
        if ("hand".equals(zoneHint) || "library".equals(zoneHint)) {
            return ownerHint != null && !ownerHint.equals(viewer);
        }
        return "unknown".equals(zoneHint) && ownerHint != null && !ownerHint.equals(viewer);
    }

    /**
     * Every card id this frame conceals from this viewer, over every card the
     * frame can see: the five card zones of every player, every library, and
     * every stack item's source card.
     *
     * <p>Libraries are walked here even though almost none of their cards are
     * serialised, and that is the point: a library card the viewer may not see
     * is exactly the kind of identity Forge's own prompt and stack strings leak
     * ("search your library for ...", {@code CostReveal}), and the sweep in
     * {@link #stackText} can only blank a text if the id in it is in this set.
     *
     * <p>Computed once, before anything is written, because {@code stack[].text}
     * is emitted before {@code stackCards} and the sweep needs the whole frame's
     * answer.
     */
    /**
     * The same set, for a caller that has a {@link GameView} rather than the
     * two lists {@link #state} already walked.
     *
     * <p>{@link WireGuiGame} caches this per frame, on the game thread, exactly
     * the way it caches {@code cardIndex} / {@code playerIndex}: the strings
     * {@link #sweepText} gates arrive on the EDT and on our io thread, where
     * walking the view graph is forbidden, so the answer has to be computed
     * where it is legal and read where it is needed.
     */
    public static Set<Integer> concealedIds(final GameView game, final PlayerView viewer) {
        assertGameThread("Snap.concealedIds");
        if (game == null || viewer == null) {
            return Set.of();
        }
        return concealedIds(players(game), stackBottomFirst(game), viewer);
    }

    private static Set<Integer> concealedIds(final List<PlayerView> players,
                                             final List<StackItemView> stack,
                                             final PlayerView viewer) {
        final Set<Integer> out = new HashSet<>();
        for (final PlayerView p : players) {
            collectConcealed(out, p.getHand(), "hand", p, viewer);
            collectConcealed(out, p.getBattlefield(), "battlefield", p, viewer);
            collectConcealed(out, p.getGraveyard(), "graveyard", p, viewer);
            collectConcealed(out, p.getExile(), "exile", p, viewer);
            collectConcealed(out, p.getCommand(), "command", p, viewer);
            collectConcealed(out, p.getLibrary(), "library", p, viewer);
        }
        for (final StackItemView si : stack) {
            final CardView src = si.getSourceCard();
            if (src != null && identityConcealed(src, viewer, "stack", si.getActivatingPlayer())) {
                out.add(Integer.valueOf(src.getId()));
            }
        }
        return out;
    }

    private static void collectConcealed(final Set<Integer> out, final Iterable<CardView> cards,
                                         final String zoneHint, final PlayerView zoneOwner,
                                         final PlayerView viewer) {
        if (cards == null) {
            return;
        }
        for (final CardView cv : cards) {
            if (cv != null && identityConcealed(cv, viewer, zoneHint, zoneOwner)) {
                out.add(Integer.valueOf(cv.getId()));
            }
        }
    }

    // ==================================================================
    // Combat
    // ==================================================================

    private static void bands(final JsonOut o, final CombatView combat) {
        for (final GameEntityView defender : combat.getDefenders()) {
            for (final Collection<CardView> band : combat.getAttackingBandsOf(defender)) {
                o.obj();
                o.key("attackerIds").arr();
                for (final CardView a : band) {
                    if (a != null) {
                        o.v(a.getId());
                    }
                }
                o.end();
                o.key("defender");
                entity(o, defender);
                final Collection<CardView> blockers =
                        combat.getBlockers((forge.util.collect.FCollection<CardView>) band);
                o.key("blockerIds").arr();
                if (blockers != null) {
                    for (final CardView b : blockers) {
                        if (b != null) {
                            o.v(b.getId());
                        }
                    }
                }
                o.end();
                // 2.0.14's CombatView stores blockers in an ordered FCollection
                // and has no separate damage-assignment order; the stored order
                // IS the order Forge assigns damage in.
                o.key("damageOrder").arr();
                if (blockers != null) {
                    for (final CardView b : blockers) {
                        if (b != null) {
                            o.v(b.getId());
                        }
                    }
                }
                o.end();
                o.end();
            }
        }
    }

    /**
     * One entry of the {@code blockers} event's {@code blocks}:
     * {@code {"attackerId":n,"blockerIds":[...]}}, with the attacker's own id
     * dropped from its blockers (amendment M52, D290).
     *
     * <p>Forge builds {@code GameEventBlockersDeclared}'s map in
     * {@code PhaseHandler.declareBlockersTurnBasedAction} as
     * {@code putAll(att, combat.getBlockers(att).isEmpty() ? List.of(att) : combat.getBlockers(att))}
     * (javap -c on the pinned jar), so an UNBLOCKED attacker arrives as its
     * own one blocker -- a sentinel, which Forge's own {@code GameLogFormatter}
     * reads back as "didn't block" (an empty list, or a first value equal to
     * the key).  A creature can never block itself, so the attacker's id in its
     * own list is never a block, and the wire says what {@code state.combat}
     * says for the same attacker: {@code blockerIds: []}.
     *
     * <p>Pure, and package-private so {@code JsonSelfTest} drives it without a
     * {@code CardView} (hard rule 10's lint keeps that type in this file).
     */
    static void block(final JsonOut o, final int attackerId, final Collection<Integer> blockerIds) {
        o.obj().n("attackerId", attackerId);
        o.key("blockerIds").arr();
        if (blockerIds != null) {
            for (final Integer b : blockerIds) {
                if (b != null && b.intValue() != attackerId) {
                    o.v(b.intValue());
                }
            }
        }
        o.end();
        o.end();
    }

    /**
     * {@code {"kind":"player"|"card","id":n}}, or null.
     *
     * <p>Every {@code defender} on the wire -- {@code combat.bands[].defender}
     * and {@code events[].bands[].defender} -- is nullable for this reason, and
     * both readers guard it (protocol 3.1).  A {@code target} is not: an event
     * whose target is missing is dropped instead, see {@link #incomplete}.
     */
    private static void entity(final JsonOut o, final GameEntityView e) {
        if (e == null) {
            o.vNull();
            return;
        }
        o.obj().n("kind", e instanceof PlayerView ? "player" : "card").n("id", e.getId()).end();
    }

    // ==================================================================
    // Game over
    // ==================================================================

    private static void gameOverBody(final JsonOut o, final GameView game, final List<PlayerView> players) {
        o.obj();
        o.nInt("winner", idOfName(players, game.getWinningPlayerName()));
        // Protocol 7: `reason` is nullable, and the null is a real state rather
        // than a missing value.  Snap.state() writes this body the instant
        // game.isGameOver() is true, while GameView.getOutcome() is
        // getMatch().getOutcomeById(getId()) -- a lookup in the Match's outcome
        // map, which is not populated at the same instant Game's own over-flag
        // is set.  A snapshot landing in that window has no win condition to
        // report, and "" would misreport that as a known empty reason.
        String reason = null;
        final forge.game.GameOutcome outcome = game.getOutcome();
        if (outcome != null && outcome.getWinCondition() != null) {
            reason = outcome.getWinCondition().name();
        }
        o.n("reason", reason);
        o.n("matchOver", game.isMatchOver());
        o.end();
    }

    /**
     * Forge's outcome carries the winner as a <em>name</em>
     * ({@code GameView.getWinningPlayerName()} is set from
     * {@code GameOutcome.getWinningLobbyPlayer().getName()}), so it has to be
     * mapped back to a player id.  Null means a draw, or a name we do not know.
     */
    private static Integer idOfName(final List<PlayerView> players, final String name) {
        if (name == null || name.isEmpty()) {
            return null;
        }
        for (final PlayerView p : players) {
            if (name.equals(p.getName()) || name.equals(p.getLobbyPlayerName())) {
                return Integer.valueOf(p.getId());
            }
        }
        return null;
    }

    // ==================================================================
    // Events (protocol section 3.6)
    // ==================================================================

    /**
     * Map one {@code GameEvent} to the small id-only shape of protocol section
     * 3.6, or write nothing if we do not carry that kind.
     *
     * <p>An {@code instanceof} chain rather than {@code IGameEventVisitor},
     * which has sixty methods.  <b>Events carry ids only</b> -- the one string
     * is {@code cast.text}, and it goes through {@link #stackText}, the same
     * gate-strip-sweep as {@code stack[].text}, because it is the same string
     * from the same {@code StackItemView}.  An id that does not resolve against
     * this same frame's zones is, by construction, a card the viewer may not
     * see; that is correct, not a bug.
     */
    private static void event(final JsonOut o, final GameEvent ev, final List<PlayerView> players,
                              final PlayerView viewer, final Set<Integer> concealed) {
        if (ev instanceof GameEventCardChangeZone e) {
            final Integer cardId = id(e.card());
            if (incomplete(cardId)) {
                return;
            }
            o.obj().n("kind", "zone").nInt("cardId", cardId);
            // from/to are legitimately null: a token created straight onto the
            // battlefield came from nowhere, and one that ceases to exist goes
            // nowhere.  Protocol 3.6 declares both nullable and every reader
            // guards them.
            o.key("from"); zoneRef(o, e.from());
            o.key("to"); zoneRef(o, e.to());
            o.end();
        } else if (ev instanceof GameEventSpellAbilityCast e) {
            final StackItemView si = e.si();
            final Integer stackId = si == null ? null : Integer.valueOf(si.getId());
            final Integer cardId = si == null ? null : id(si.getSourceCard());
            final Integer ctrl = si == null ? null : pid(si.getActivatingPlayer());
            if (incomplete(stackId, cardId, ctrl)) {
                return;
            }
            o.obj().n("kind", "cast");
            o.nInt("stackId", stackId);
            o.nInt("cardId", cardId);
            o.nInt("controller", ctrl);
            o.n("text", stackText(si, viewer, concealed));
            // NOT emitted: e.targetDescription().  It is built by
            // computeTargetDescription from TargetChoices.toString(), which
            // names every target including cards in a LIBRARY (report 06
            // section 4).  stack[].targetCardIds carries the same information
            // as ids, which is what the client resolves anyway.
            o.end();
        } else if (ev instanceof GameEventSpellResolved e) {
            final SpellAbilityView sa = e.spell();
            final Integer cardId = sa == null ? null : id(sa.getHostCard());
            if (incomplete(cardId)) {
                return;
            }
            o.obj().n("kind", "resolved");
            o.nInt("cardId", cardId);
            o.n("fizzled", e.hasFizzled());
            // NOT emitted: e.stackDescription().  Same string as stack[].text
            // but reached from a different accessor, i.e. exactly the second
            // ungated path that section 10.12 of the protocol is about.  If a
            // resolved event ever needs a description, it goes through
            // Snap.stackText or it does not go.
            o.end();
        } else if (ev instanceof GameEventSpellRemovedFromStack e) {
            final SpellAbilityView sa = e.sa();
            final Integer cardId = sa == null ? null : id(sa.getHostCard());
            if (incomplete(cardId)) {
                return;
            }
            o.obj().n("kind", "unstacked");
            o.nInt("cardId", cardId);
            o.end();
        } else if (ev instanceof GameEventAttackersDeclared e) {
            final Integer player = pid(e.player());
            if (incomplete(player)) {
                return;
            }
            o.obj().n("kind", "attackers");
            o.nInt("player", player);
            o.key("bands").arr();
            final Multimap<GameEntityView, CardView> map = e.attackersMap();
            if (map != null) {
                for (final Map.Entry<GameEntityView, Collection<CardView>> entry : map.asMap().entrySet()) {
                    o.obj();
                    o.key("defender"); entity(o, entry.getKey());
                    o.key("attackerIds").arr();
                    for (final CardView c : entry.getValue()) {
                        if (c != null) {
                            o.v(c.getId());
                        }
                    }
                    o.end();
                    o.end();
                }
            }
            o.end().end();
        } else if (ev instanceof GameEventBlockersDeclared e) {
            final Integer defending = pid(e.defendingPlayer());
            if (incomplete(defending)) {
                return;
            }
            o.obj().n("kind", "blockers");
            o.nInt("defendingPlayer", defending);
            o.key("blocks").arr();
            final Map<GameEntityView, Multimap<CardView, CardView>> byDefender = e.blockers();
            if (byDefender != null) {
                for (final Multimap<CardView, CardView> m : byDefender.values()) {
                    if (m == null) {
                        continue;
                    }
                    for (final Map.Entry<CardView, Collection<CardView>> entry : m.asMap().entrySet()) {
                        if (entry.getKey() == null) {
                            continue;   // a block with no attacker is not a block
                        }
                        final List<Integer> ids = new ArrayList<>();
                        for (final CardView b : entry.getValue()) {
                            if (b != null) {
                                ids.add(Integer.valueOf(b.getId()));
                            }
                        }
                        block(o, entry.getKey().getId(), ids);
                    }
                }
            }
            o.end().end();
        } else if (ev instanceof GameEventPlayerDamaged e) {
            final Integer source = id(e.source());
            if (incomplete(e.target(), source)) {
                return;
            }
            o.obj().n("kind", "damage");
            o.key("target"); entity(o, e.target());
            o.nInt("sourceCardId", source);
            o.n("amount", e.amount());
            o.n("combat", e.combat());
            o.nNull("damageType");
            o.end();
        } else if (ev instanceof GameEventCardDamaged e) {
            final Integer source = id(e.source());
            if (incomplete(e.card(), source)) {
                return;
            }
            o.obj().n("kind", "damage");
            o.key("target"); entity(o, e.card());
            o.nInt("sourceCardId", source);
            o.n("amount", e.amount());
            // 2.0.14's card-damage event has no combat flag, only a DamageType.
            o.n("combat", e.type() != null && e.type().name().contains("Combat"));
            o.n("damageType", e.type() == null ? null : e.type().name());
            o.end();
        } else if (ev instanceof GameEventPlayerLivesChanged e) {
            final Integer player = pid(e.player());
            if (incomplete(player)) {
                return;
            }
            o.obj().n("kind", "life");
            o.nInt("player", player);
            o.n("from", e.oldLives());
            o.n("to", e.newLives());
            o.end();
        } else if (ev instanceof GameEventPlayerPoisoned e) {
            final Integer player = pid(e.receiver());
            if (incomplete(player)) {
                return;
            }
            o.obj().n("kind", "poison");
            o.nInt("player", player);
            // Nullable by design: poison from an effect with no player source.
            o.nInt("sourcePlayer", pid(e.source()));
            o.n("from", e.oldValue());
            o.n("amount", e.amount());
            o.end();
        } else if (ev instanceof GameEventCardTapped e) {
            final Integer cardId = id(e.card());
            if (incomplete(cardId)) {
                return;
            }
            o.obj().n("kind", "tap").nInt("cardId", cardId).n("tapped", e.tapped()).end();
        } else if (ev instanceof GameEventCardCounters e) {
            final Integer cardId = id(e.card());
            final String counter = e.type() == null ? null : e.type().getName();
            if (incomplete(cardId, counter)) {
                return;
            }
            o.obj().n("kind", "counters").nInt("cardId", cardId);
            o.n("counter", counter);
            o.n("from", e.oldValue()).n("to", e.newValue()).end();
        } else if (ev instanceof GameEventCardAttachment e) {
            final Integer cardId = id(e.equipment());
            if (incomplete(cardId)) {
                return;
            }
            o.obj().n("kind", "attach");
            o.nInt("cardId", cardId);
            // Nullable by design: null is the unattach event.
            o.key("to"); entity(o, e.newTarget());
            o.end();
        } else if (ev instanceof GameEventCardSacrificed e) {
            final Integer cardId = id(e.card());
            if (incomplete(cardId)) {
                return;
            }
            o.obj().n("kind", "sacrificed");
            o.nInt("cardId", cardId);
            o.end();
        } else if (ev instanceof GameEventLandPlayed e) {
            final Integer player = pid(e.player());
            final Integer cardId = id(e.land());
            if (incomplete(player, cardId)) {
                return;
            }
            o.obj().n("kind", "land");
            o.nInt("player", player);
            o.nInt("cardId", cardId);
            o.end();
        } else if (ev instanceof GameEventCardStatsChanged e) {
            o.obj().n("kind", "stats").key("cardIds").arr();
            if (e.cards() != null) {
                for (final CardView c : e.cards()) {
                    if (c != null) {
                        o.v(c.getId());
                    }
                }
            }
            o.end().n("transform", e.transform()).end();
        } else if (ev instanceof GameEventTurnBegan e) {
            final Integer player = pid(e.turnOwner());
            if (incomplete(player)) {
                return;
            }
            o.obj().n("kind", "turn");
            o.nInt("player", player);
            o.n("turn", e.turnNumber()).end();
        } else if (ev instanceof GameEventTurnPhase e) {
            final Integer player = pid(e.playerTurn());
            final String phase = e.phase() == null ? null : e.phase().name();
            if (incomplete(player, phase)) {
                return;
            }
            o.obj().n("kind", "phase");
            o.nInt("player", player);
            o.n("phase", phase).end();
        } else if (ev instanceof GameEventCombatEnded e) {
            o.obj().n("kind", "combat_end").key("attackerIds").arr();
            if (e.attackers() != null) {
                for (final CardView c : e.attackers()) {
                    if (c != null) {
                        o.v(c.getId());
                    }
                }
            }
            o.end().key("blockerIds").arr();
            if (e.blockers() != null) {
                for (final CardView c : e.blockers()) {
                    if (c != null) {
                        o.v(c.getId());
                    }
                }
            }
            o.end().end();
        } else if (ev instanceof GameEventShuffle e) {
            final Integer player = pid(e.player());
            if (incomplete(player)) {
                return;
            }
            o.obj().n("kind", "shuffle");
            o.nInt("player", player);
            o.end();
        } else if (ev instanceof GameEventMulligan e) {
            final Integer player = pid(e.player());
            if (incomplete(player)) {
                return;
            }
            o.obj().n("kind", "mulligan");
            o.nInt("player", player);
            o.end();
        } else if (ev instanceof GameEventScry e) {
            // Counts only, and genuinely public: everyone at the table sees how
            // many cards went to the top and how many to the bottom, nobody sees
            // which.  Without this the whole scry is invisible in our stream.
            final Integer player = pid(e.player());
            if (incomplete(player)) {
                return;
            }
            o.obj().n("kind", "scry");
            o.nInt("player", player);
            o.n("toTop", e.toTop()).n("toBottom", e.toBottom()).end();
        } else if (ev instanceof GameEventSurveil e) {
            final Integer player = pid(e.player());
            if (incomplete(player)) {
                return;
            }
            o.obj().n("kind", "surveil");
            o.nInt("player", player);
            o.n("toLibrary", e.toLibrary()).n("toGraveyard", e.toGraveyard()).end();
        } else if (ev instanceof GameEventCardPhased e) {
            // Battlefield-public, and phasing is otherwise invisible in `state`
            // (a phased-out permanent simply stops being in the battlefield
            // collection).  phaseState() is Card.isPhasedOut() at the moment the
            // event fired (Card.java:5614).
            final Integer cardId = id(e.card());
            if (incomplete(cardId)) {
                return;
            }
            o.obj().n("kind", "phased").nInt("cardId", cardId)
             .n("phasedOut", e.phaseState()).end();
        } else if (ev instanceof GameEventCardForetold e) {
            // NOTE: this event carries NO card -- the record is
            // GameEventCardForetold(PlayerView activatingPlayer) [javap on the
            // 2.0.14 jar; fired at CardFactoryUtil.java:3005].  It is safe by
            // construction and it is the only cue that a foretell happened; the
            // face-down card itself shows up as a stub in that player's exile.
            // The amendment list asked for `{cardId}`, which the engine cannot
            // give us.
            final Integer player = pid(e.activatingPlayer());
            if (incomplete(player)) {
                return;
            }
            o.obj().n("kind", "foretold").nInt("player", player).end();
        } else if (ev instanceof GameEventGameOutcome e) {
            o.obj().n("kind", "outcome");
            // Nullable by design: null is a draw.
            o.nInt("winner", idOfName(players, e.winningPlayerName()));
            o.n("lastTurn", e.lastTurnNumber());
            // NOT emitted: e.outcomeStrings() and e.matchSummary(), both free
            // text built from player names and card names (report 06 section 4).
            o.end();
        }
        // Everything else is dropped on purpose (protocol 3.6 rule 4).  The
        // drops that are a REDACTION decision rather than a "nothing useful in
        // it" decision, so that a later reader does not "improve" the mapping:
        //
        //   GameEventAddLog / GameEventRandomLog -- a free-form message built
        //     from CardView.toString(), i.e. "<zone> <name> (<id>)", for any
        //     card in any zone: "X discards <card>", CostReveal, ChangeZone.
        //     Never redacted by Forge.  Do not build a game-log pane out of it.
        //   GameEventSubgameStart / GameEventSubgameEnd -- carries a whole
        //     forge.game.Game object.
        //   GameEventAnteCardsSelected -- a Multimap<PlayerView, CardView> of
        //     cards taken off the top of both libraries.
        //   GameEventZone -- NOT payload-less in 2.0.14 (javap: zoneType(),
        //     player(), mode(), card(), sa()), but still dropped:
        //     GameEventCardChangeZone covers every real movement, and this also
        //     fires from Player.updateFlashbackForView, which would broadcast
        //     that a LIBRARY card became activatable.
        //
        // And the merely-uninteresting ones: GameEventCombatChanged/Update,
        // GameEventManaPool, GameEventPlayerPriority, GameEventGameStarted /
        // Finished, GameEventCardDestroyed, GameEventTokenCreated, all either
        // payload-less or already implied by the snapshot this batch produced.
    }

    /**
     * {@code {"zone":"hand","player":0}}, or {@code null}.
     *
     * <p>Null is a real answer here, not an error: a token created directly onto
     * the battlefield came {@code from} nowhere, and a token that ceases to exist
     * goes {@code to} nowhere.  Both occur in every recorded fixture.  A zone
     * with no {@code ZoneType} is likewise emitted as a null ref rather than as
     * an object with a null {@code zone}, so {@code ZoneRef.zone} is always a
     * string.  {@code player} is the zone owner's id, null for shared zones.
     */
    private static void zoneRef(final JsonOut o, final ZoneView z) {
        if (z == null || z.zoneType() == null) {
            o.vNull();
            return;
        }
        o.obj();
        o.n("zone", lower(z.zoneType().name()));
        o.nInt("player", pid(z.player()));
        o.end();
    }

    // ==================================================================

    private static String lower(final String s) {
        return s == null ? null : s.toLowerCase(Locale.ROOT);
    }

    private static boolean empty(final String s) {
        return s == null || s.isEmpty();
    }

    /** The protocol's string fields are never null; a missing string is "". */
    private static String nz(final String s) {
        return s == null ? "" : s;
    }

    /**
     * {@code "counters": {"+1/+1": 1}} -- the same object for a card and a face-down card.
     *
     * <p>The key is {@code CounterType.getName()}, Forge's DISPLAY name, not the
     * enum constant: {@code +1/+1}, {@code -1/-1}, {@code Spore}. That is what
     * every byte in {@code fixtures/} carries and what docs/protocol.md §3.1 /
     * §3.2 / §3.6 say as of amendment M43 (decision D46 keeps it).
     */
    private static void counters(final JsonOut o, final Multiset<CounterType> counters) {
        o.key("counters").obj();
        if (counters != null) {
            for (final Multiset.Entry<CounterType> e : counters.entrySet()) {
                if (e.getElement() != null) {
                    o.n(e.getElement().getName(), e.getCount());
                }
            }
        }
        o.end();
    }

    /**
     * <b>Amendment M49 -- {@code "keywords": ["FLYING", "FIRST_STRIKE"]}</b>: the
     * card's keyword abilities as Forge's {@link forge.game.keyword.Keyword}
     * CONSTANTS, spelled by {@code name()} (convention a), deduplicated, in
     * Forge's own order.  Read from {@code CardStateView.getKeywords()} of the
     * CURRENT state only, so a keyword a static grants is here and a keyword
     * an effect removed is not -- the engine's answer, never the printed text.
     *
     * <p><b>Only constants reach the wire, never a display string.</b>  Every
     * keyword with a {@code Keyword} constant is written by its name and no
     * parameter (Ward's cost, Equip's cost, Protection's quality stay off:
     * {@code WARD}, {@code EQUIP}, {@code PROTECTION}).  A keyword Forge could
     * not map to a constant is {@code Keyword.UNDEFINED}, and it is OMITTED:
     * the one such keyword a census of 14 recordings over every deck in
     * {@code decks/} found is {@code ETBReplacement:Other:ChooseColor} -- engine
     * script, not a keyword printed on a card -- whose {@code title()} is
     * {@code ""}.  Its {@code original()} would be an engine string on the wire,
     * which hard rule 8 allows through one function only; a closed vocabulary
     * needs none, and {@code tools/check-redaction.mjs} holds every entry to the
     * constant's shape.  (docs/evidence/status-layer.md section 1.)
     *
     * <p><b>A face-down card carries {@code []}</b>, in both branches of gate
     * 2, exactly as its {@code name} is {@code ""}: the caller passes
     * {@code null}.  The face-down characteristic exposed no keyword on any of
     * the 433 face-down instances the census recorded, and the empty list is
     * forced rather than trusted, for the same reason the name is.
     *
     * @param kws the current state's keywords, or {@code null} to write {@code []}
     */
    private static void keywords(final JsonOut o, final KeywordCollectionView kws) {
        o.key("keywords").arr();
        if (kws != null) {
            final Set<String> names = new java.util.LinkedHashSet<>();
            for (final KeywordView kv : kws) {
                final Keyword k = kv == null ? null : kv.keyword();
                if (k != null && k != Keyword.UNDEFINED) {
                    names.add(k.name());
                }
            }
            for (final String n : names) {
                o.v(n);
            }
        }
        o.end();
    }

    /** A card id, or null. */
    private static Integer id(final CardView c) {
        return c == null ? null : Integer.valueOf(c.getId());
    }

    /** A player id, or null. */
    private static Integer pid(final PlayerView p) {
        return p == null ? null : Integer.valueOf(p.getId());
    }

    /**
     * Protocol 3.6, "missing ids": an event whose subject the engine could not
     * give us is <b>dropped</b>, not emitted with a null where the protocol
     * declares a number.  An event with no card is of no use to a renderer, and
     * a null wearing a non-null type is how a renderer crashes three milestones
     * later.  Every drop is counted so the choice is visible.
     *
     * @return true if any argument is null, in which case the caller must emit
     *         nothing at all for this event
     */
    private static boolean incomplete(final Object... required) {
        for (final Object r : required) {
            if (r == null) {
                INCOMPLETE_EVENTS.incrementAndGet();
                return true;
            }
        }
        return false;
    }
}
