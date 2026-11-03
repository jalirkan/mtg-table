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
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import forge.ai.ComputerUtilAbility;
import forge.ai.ComputerUtilCost;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.GameObject;
import forge.game.card.Card;
import forge.game.card.CardCollection;
import forge.game.combat.Combat;
import forge.game.combat.CombatUtil;
import forge.game.phase.PhaseHandler;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.spellability.SpellAbilityStackInstance;
import forge.game.spellability.TargetRestrictions;
import forge.game.zone.ZoneType;

/**
 * Builds {@link Decision}s from the live game for {@link PolicyControllerAi}
 * (D347).  Everything here runs on the game thread, inside the controller's own
 * callback, reads only what the deciding seat may know -- its hand, the public
 * zones, the engine's legality checks for its own plays -- and changes nothing
 * the game reads: the legality checks are the ones Forge's own AI makes on every
 * priority ({@code canPlay}, {@code canPayCost} without paying), run AFTER
 * Forge (and the policies) chose, so they cannot steer the choice.
 *
 * <p><b>What the seat cannot see is never named.</b>  A card offered by an
 * effect from a zone the seat cannot see -- a library search, the other
 * player's hand -- is counted in {@code hidden} and played as
 * {@code option:hidden}; its id never reaches the record.  Ids of the seat's
 * own hand are its own information, and the record goes into its own
 * recording only.  Where a card is, is where the game holds it now, never
 * where the object handed in says it is (D508: a last-known copy of a card
 * that left the battlefield for a hand says Battlefield).
 */
public final class Decisions {

    private Decisions() { }

    /** Most attack or block combinations listed in full; past it, a shortlist ({@code complete: false}). */
    public static final int MAX_COMBINATIONS = 64;

    static Decision base(final String kind, final Player ai) {
        final PhaseHandler ph = ai.getGame().getPhaseHandler();
        return new Decision(kind, ph.getTurn(), ph.getPhase() == null ? "NONE" : ph.getPhase().name());
    }

    // ------------------------------------------------------------------
    // Tokens
    // ------------------------------------------------------------------

    /** {@code pass}, {@code land:<id>}, {@code cast:<id>} or {@code activate:<id>[#k]}. */
    public static String saToken(final SpellAbility sa) {
        if (sa == null || sa.getHostCard() == null) {
            return "pass";
        }
        final Card host = sa.getHostCard();
        if (sa.isLandAbility()) {
            return "land:" + host.getId();
        }
        if (sa.isSpell()) {
            return "cast:" + host.getId();
        }
        // The k-th non-mana activated ability of the card, when it has more than one.
        int k = -1;
        int count = 0;
        final String desc = sa.getDescription();
        for (final SpellAbility s : host.getSpellAbilities()) {
            if (s.isSpell() || s.isManaAbility() || s.isLandAbility()) {
                continue;
            }
            if (k < 0 && (s == sa || desc != null && desc.equals(s.getDescription()))) {
                k = count;
            }
            count++;
        }
        return "activate:" + host.getId() + (count > 1 && k >= 0 ? "#" + k : "");
    }

    /**
     * Whether {@code ai} sees {@code c}'s identity where it is now (the redaction's own zones).  D507: a card in
     * the Stack zone is seen only while the stack holds a spell or ability of it ({@link #onStack}) -- the state
     * frame's stack is the stack's items ({@code Snap}'s {@code stackBottomFirst}), so a card in the zone with
     * none is a card no frame shows: the ghost of a cast Forge's AI abandoned after moving the card there.
     *
     * <p>D508: "where it is now" is where the GAME holds the card, never where the object handed in says it is.
     * An effect may hand the seat a last-known copy of a card -- the {@code Card} of a ChangesZone trigger whose
     * origin is the battlefield, which {@code ChooseSourceEffect} lists under "objects referred to on the stack"
     * (J185's Circle of Protection: Blue, with Luminous Phantom's trigger naming the Cavern Harpy that had just
     * returned to its owner's hand).  Forge makes that copy from its last-state snapshot, and
     * {@code Zone.getLKICopy} → {@code setCards} stamps every copy with a Battlefield zone, so the copy's own
     * {@code getZone()} says public while the card is in a hand.  {@link #current} resolves the id to the card
     * the game holds now; a card in no zone at all (a token that ceased to exist, D503's shape) is judged by the
     * object itself, as before.  A spell or ability on the stack is judged through {@link #visibleAt} on its own
     * host object, not the current card: the state frame's {@code stackCards} serialise the item's host with the
     * zone hint {@code stack} (D508's review), so an item whose source has since moved to a hand stays listed as
     * the frame lists it.
     */
    public static boolean visible(final Card c, final Player ai) {
        return visibleAt(current(c), ai);
    }

    /** D347's zone rule over the object handed in, as it stands ({@link #visible} resolves the card first; D508). */
    static boolean visibleAt(final Card now, final Player ai) {
        if (now.getZone() == null) {
            return false;
        }
        final ZoneType z = now.getZone().getZoneType();
        switch (z) {
            case Stack:
                return now.isCopiedSpell() || onStack(now);   // D507: a copy is never a ghost (onStack's comment)
            case Battlefield:
            case Graveyard:
            case Command:
                return true;      // public zones (a face-down card is listed by id there too)
            case Hand:
                return now.getZone().getPlayer() == ai;
            case Exile:
                return !now.isFaceDown() || now.getController() == ai;
            default:
                return false;     // libraries, sideboards, ante, the void
        }
    }

    /**
     * D508: the card as the game holds it now -- {@code Game.getCardState}, which walks every zone for the id
     * (the Stack zone included, so D507's ghost resolves to itself) -- or {@code c} when no zone holds its id: a
     * token that ceased to exist, or a spell copy the Stack zone does not list.
     */
    public static Card current(final Card c) {
        final Game g = c.getGame();
        if (g == null) {
            return c;
        }
        final Card now = g.getCardState(c, null);
        return now == null ? c : now;
    }

    /** D508: a card handed in as an object the game no longer holds under that id (a last-known copy, a stale instance). */
    public static boolean lastKnown(final Object e) {
        return e instanceof Card && current((Card) e) != e;
    }

    /** D508: the worker log's line for a last-known copy left out of a record; {@code [lki]} is what the night counts. */
    static String lastKnownLine(final int id) {
        return "[lki] card " + id + " offered as a last-known copy of a card in a zone the seat cannot see, left out of a record (D508)";
    }

    /**
     * D507: whether the game's stack holds a spell or ability whose source card is {@code c} (by id: a fork's
     * copier keeps ids).  False for a card in the Stack zone that the stack holds nothing of -- a ghost:
     * {@code ComputerUtil.handlePlayingSpellAbility} moves a spell's card to the Stack zone before its targets
     * and payment, and when {@code MagicStack.add} then refuses the spell ("Couldn't add to stack, failed to
     * target") or the AI returns early (an invalid target count, a modal spell with no mode), nothing moves the
     * card back.  It is in {@code game.getCardsIn(ZoneType.Stack)}, so {@code TargetRestrictions.getAllCandidates}
     * offers it to a part that targets a spell.  A spell still being cast (its card moved, its instance not yet
     * added) is not on the stack either; the spell's own targeting never offers it (rule 115.5,
     * {@code SpellAbility.canTarget}), and another seat's is a card no frame shows.
     *
     * <p>{@code MagicStack}'s iterator walks the stack alone, never its frozen part.  While a resolution freezes
     * the stack, a copy of a spell made by the resolving effect has its card in the Stack zone and its instance
     * on the frozen stack ({@code MagicStack.add}'s frozen branch) until the resolution ends -- and the next copy
     * chooses its targets then (Forge's AI: {@code PlayerControllerAi.orderAndPlaySimultaneousSa}).  So
     * {@link #visible} takes a copy as seen on its own: a copy cannot be a ghost, because {@code add} skips the
     * targeting check for one ({@code isCopied}, offsets 388-392 on the jar) and the AI's copy path reaches
     * {@code add} with no early return (offsets 73-170).  A spell cast from a play effect skips the freeze.
     */
    static boolean onStack(final Card c) {
        final Game g = c.getGame();
        if (g == null) {
            return false;
        }
        for (final SpellAbilityStackInstance si : g.getStack()) {
            final Card src = si.getSourceCard();
            if (src != null && src.getId() == c.getId()) {
                return true;
            }
        }
        return false;
    }

    /**
     * D507: a card in the Stack zone, not a copy, that the stack holds no spell or ability of ({@link #onStack}).
     * D508: judged on the card the game holds, as {@link #visible} is, so a stale Stack-zone object whose card has
     * moved on is a last-known copy ({@link #lastKnown}), not a ghost.
     */
    static boolean ghost(final Object e) {
        if (!(e instanceof Card)) {
            return false;
        }
        final Card now = current((Card) e);
        return now.getZone() != null && now.getZone().is(ZoneType.Stack) && !now.isCopiedSpell() && !onStack(now);
    }

    /** D507: the worker log's line for a ghost left out of a target record; {@code [ghost]} is what the night counts. */
    static String ghostLine(final int id) {
        return "[ghost] card " + id + " in the stack zone with no stack instance left out of a target record (D507)";
    }

    /** An entity as {@code <prefix>:<id>}, {@code <prefix>:p<id>}, or null when the seat cannot see it. */
    public static String entityToken(final String prefix, final Object e, final Player ai) {
        if (e instanceof Player) {
            return prefix + ":p" + ((Player) e).getId();
        }
        if (e instanceof Card) {
            final Card c = (Card) e;
            return visible(c, ai) ? prefix + ":" + c.getId() : null;
        }
        if (e instanceof SpellAbility) {   // a spell or ability on the stack: its source card, as stackCards shows it
            final Card h = ((SpellAbility) e).getHostCard();
            return h != null && visibleAt(h, ai) ? prefix + ":" + h.getId() : null;   // D508: the host object's own zone
        }
        return null;
    }

    // ------------------------------------------------------------------
    // Priority
    // ------------------------------------------------------------------

    /**
     * Every play the seat could make with this priority: {@code pass}, each land
     * it may play now, and every spell and non-mana ability Forge says it can
     * play and pay for -- the same checks {@code SearchPolicy}'s candidate list
     * makes, without Forge's judgment of whether it is wise.
     */
    public static Decision priority(final Player ai) {
        return quiet(() -> priority0(ai));
    }

    /**
     * Run {@code f} with Forge's {@code MyRandom} replaced by a throwaway
     * generator and the real one put back after, as the search's rollouts do
     * (D312).  Forge's legality checks can draw from it (a mana-source tie, an AI
     * "chance"), and a draw here would move the real game's stream: measured
     * (D347), the first version of these records turned a 16-turn game into an
     * 18-turn one that way.  Every engine call a record makes goes through here.
     */
    static <T> T quiet(final java.util.function.Supplier<T> f) {
        final java.util.Random real = forge.util.MyRandom.getRandom();
        forge.util.MyRandom.setRandom(new java.util.Random(0x5EED));
        try {
            return f.get();
        } finally {
            forge.util.MyRandom.setRandom(real);
        }
    }

    private static Decision priority0(final Player ai) {
        final Decision d = base("priority", ai);
        final Game g = ai.getGame();
        final Set<String> lands = new TreeSet<>(Decisions::byId);
        final Set<String> plays = new TreeSet<>(Decisions::byId);
        lands.addAll(landPlays(ai).keySet());   // D466: the seat's own listing of its land plays
        // A permanent with no activated ability but mana abilities (most lands, a vanilla creature) offers no
        // option of its own: skipping it before Forge builds each card's ability
        // list is most of the enumeration's saving on a full board.
        final CardCollection cards = new CardCollection();
        for (final Card c : ComputerUtilAbility.getAvailableCards(g, ai)) {
            if (c.isInZone(ZoneType.Battlefield) && onlyManaAbilities(c)) {
                continue;
            }
            cards.add(c);
        }
        // Each card's own spells and abilities first; a spell's alternative costs
        // (flashback, evoke, ...) only when its own cost cannot be paid -- they
        // spell the same token, and expanding them all at every priority was half
        // the records' cost (D347's measurement).
        final List<SpellAbility> own = ComputerUtilAbility.getSpellAbilities(cards, ai);
        final List<SpellAbility> retry = new ArrayList<>();
        for (final SpellAbility sa : own) {
            if (playable(sa, ai, plays) == Boolean.FALSE && sa.isSpell()) {
                retry.add(sa);
            }
        }
        if (!retry.isEmpty()) {
            final List<SpellAbility> alts = ComputerUtilAbility.getOriginalAndAltCostAbilities(retry, ai);
            for (final SpellAbility sa : alts) {
                if (!retry.contains(sa)) {
                    playable(sa, ai, plays);
                }
            }
        }
        d.options.add("pass");
        d.options.addAll(lands);
        d.options.addAll(plays);
        return d;
    }

    /**
     * D466: every land the seat may play now, by token, with its land
     * abilities -- the ONE listing the decision record's options and the random
     * and exploring seats' options are built from, so the record never offers a
     * land the seat could not play.  Forge's {@code
     * ComputerUtilAbility.getAvailableLandsToPlay} checks the land drop
     * ({@code Player.canPlayLand}) only for the hand; a land in exile, the
     * graveyard or on top of the library is listed when something lets the seat
     * play it (Laelia, the Blade Reforged's "you may play that card this turn"),
     * land drop used or not.  A land ability's own {@code canPlay} is the land
     * drop ({@code LandAbility.canPlay} calls {@code Player.canPlayLand}), and
     * {@code Card.getAllPossibleAbilities(seat, true)} keeps only the ones that
     * can be played -- so a land is listed when it has one.
     */
    public static java.util.Map<String, List<SpellAbility>> landPlays(final Player ai) {
        final java.util.Map<String, List<SpellAbility>> out = new java.util.LinkedHashMap<>();
        final CardCollection lands = ComputerUtilAbility.getAvailableLandsToPlay(ai.getGame(), ai);
        if (lands == null) {
            return out;
        }
        for (final Card c : lands) {
            final List<SpellAbility> las = new ArrayList<>();
            for (final SpellAbility sa : c.getAllPossibleAbilities(ai, true)) {
                if (sa.isLandAbility()) {
                    las.add(sa);
                }
            }
            if (!las.isEmpty()) {
                out.putIfAbsent("land:" + c.getId(), las);
            }
        }
        return out;
    }

    private static boolean onlyManaAbilities(final Card c) {
        for (final SpellAbility s : c.getSpellAbilities()) {
            if (!s.isManaAbility() && !s.isSpell() && !s.isLandAbility()) {
                return false;   // an activated ability that is not a mana ability
            }
        }
        return true;
    }

    /**
     * Adds {@code sa}'s token to {@code plays} when the seat may play and pay for
     * it now; TRUE when added, FALSE when it was checked and is not playable,
     * null when it is not a candidate at all (a land, a mana ability, a trigger,
     * another player's card, a token already listed).
     */
    private static Boolean playable(final SpellAbility sa, final Player ai, final Set<String> plays) {
        if (sa.isLandAbility() || sa.isManaAbility() || sa.isTrigger()) {
            return null;
        }
        final Card host = sa.getHostCard();
        if (host == null || host.getController() != ai && host.getOwner() != ai) {
            return null;
        }
        final String tok = saToken(sa);
        if (plays.contains(tok)) {
            return null;
        }
        try {
            sa.setActivatingPlayer(ai);
            if (!sa.canPlay() || !Explorer.modesCastable(sa)) {
                return Boolean.FALSE;   // D486: a modal spell with too few legal modes cannot be cast
            }
            if (ComputerUtilCost.canPayCost(sa, ai, false)) {
                plays.add(tok);
                return Boolean.TRUE;
            }
            return Boolean.FALSE;
        } catch (final RuntimeException e) {
            return Boolean.FALSE;   // an ability Forge cannot evaluate here is not an option
        }
    }

    /** Order tokens by verb, then numerically by id (stable across runs). */
    static int byId(final String a, final String b) {
        final int ia = a.indexOf(':');
        final int ib = b.indexOf(':');
        final int v = a.substring(0, ia).compareTo(b.substring(0, ib));
        if (v != 0) {
            return v;
        }
        final String ra = a.substring(ia + 1);
        final String rb = b.substring(ib + 1);
        final int c = Long.compare(num(ra), num(rb));
        return c != 0 ? c : ra.compareTo(rb);
    }

    private static long num(final String s) {
        int i = 0;
        while (i < s.length() && !Character.isDigit(s.charAt(i))) {
            i++;
        }
        int j = i;
        while (j < s.length() && Character.isDigit(s.charAt(j))) {
            j++;
        }
        return i == j ? 0 : Long.parseLong(s.substring(i, j));
    }

    /**
     * One {@code target} decision per targeting part of {@code sa} (the spell
     * and its sub-abilities): every candidate the engine allows, and the
     * targets the answer carries.  A candidate on the stack (a spell to
     * counter) is not in Forge's candidate list; it is added from the answer
     * and the decision marked incomplete.  D487: a part that may take no
     * target (minimum 0) lists {@code target:none} and carries {@code min}; a
     * part left empty answers {@code target:none}, never null.
     */
    public static List<Decision> targets(final SpellAbility sa, final Player ai, final String source) {
        return targets(sa, ai, source, null);
    }

    /** D487: the answer of a targeting part left empty, listed when the part's minimum is 0 (protocol M76). */
    public static final String TARGET_NONE = "target:none";
    /** D487: the {@code why} of a target record whose part has a minimum of 1 or more and was left empty. */
    public static final String NO_TARGET = "NO_TARGET";

    /** {@link #targets(SpellAbility, Player, String)}, each part play exploration changed carrying its mark (D358). */
    public static List<Decision> targets(final SpellAbility sa, final Player ai, final String source,
                                         final java.util.Map<SpellAbility, Decision.Explore> marks) {
        return quiet(() -> targets0(sa, ai, source, marks));
    }

    /**
     * D485: the targets of a play the seat hands to the engine at priority, read
     * from the parts the engine reads when it casts it ({@link Explorer#castParts}):
     * for a modal spell, its chosen modes, not the chain of copies Forge's
     * {@code CharmAi} built, which the cast discards.  Any other play: its chain,
     * as {@link #targets(SpellAbility, Player, String, java.util.Map)}.
     */
    public static List<Decision> castTargets(final SpellAbility sa, final Player ai,
                                             final java.util.Map<SpellAbility, Decision.Explore> marks) {
        return castTargets(sa, ai, "targets", marks);
    }

    /** {@link #castTargets(SpellAbility, Player, java.util.Map)} under another {@code source} (D486: {@code "modes"}). */
    public static List<Decision> castTargets(final SpellAbility sa, final Player ai, final String source,
                                             final java.util.Map<SpellAbility, Decision.Explore> marks) {
        return quiet(() -> targets0(Explorer.castParts(sa), ai, source, marks));
    }

    private static List<Decision> targets0(final SpellAbility sa, final Player ai, final String source,
                                           final java.util.Map<SpellAbility, Decision.Explore> marks) {
        final List<SpellAbility> chain = new ArrayList<>();
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            chain.add(s);
        }
        return targets0(chain, ai, source, marks);
    }

    private static List<Decision> targets0(final List<SpellAbility> parts, final Player ai, final String source,
                                           final java.util.Map<SpellAbility, Decision.Explore> marks) {
        final List<Decision> out = new ArrayList<>();
        for (final SpellAbility s : parts) {
            if (!s.usesTargeting()) {
                continue;
            }
            final Decision d = base("target", ai);
            d.source = source;
            d.explore = marks == null ? null : marks.get(s);
            final Set<String> opts = new LinkedHashSet<>();
            final TargetRestrictions tr = s.getTargetRestrictions();
            // D487: the part's minimum and maximum (TargetMin$ / TargetMax$, which may be SVars: Tear Asunder's
            // X and Y are 0 or 1 on whether it was kicked).  Unknown (no restrictions): one, as a plain target.
            final int min = tr == null ? 1 : tr.getMinTargets(s.getHostCard(), s);
            final int max = tr == null ? 1 : tr.getMaxTargets(s.getHostCard(), s);
            if (tr != null && max > 0) {
                // D486: every candidate, players and cards -- getAllCandidates' flag is onlyNonCard (forge-game
                // TargetRestrictions.java:571-584 at the forge-2.0.14 tag), so (s, true) listed the players alone
                // and every card target was added from the answer with the record marked incomplete.  D487: a part
                // whose maximum is 0 (Tear Asunder's other half) takes no target, so it lists no candidate.
                final Collection<GameEntity> cands = tr.getAllCandidates(s, false);
                for (final GameEntity e : cands) {
                    final String t = entityToken("target", e, ai);
                    if (t == null) {
                        d.hidden++;
                        if (ghost(e)) {
                            System.err.println(ghostLine(e.getId()));   // D507: the night's ghost_candidates
                        } else if (lastKnown(e)) {
                            System.err.println(lastKnownLine(((Card) e).getId()));   // D508: lki_candidates
                        }
                    } else {
                        opts.add(t);
                    }
                }
            }
            final List<String> chosen = new ArrayList<>();
            int unseen = 0;
            for (final GameObject t : s.getTargets()) {
                final String tok = entityToken("target", t, ai);
                if (tok != null) {
                    chosen.add(tok);
                    if (opts.add(tok)) {
                        d.complete = false;
                    }
                } else {
                    unseen++;
                }
            }
            targetAnswer(d, opts, chosen, unseen, min);
            out.add(d);
        }
        return out;
    }

    /**
     * D487 (protocol M76): a target record's options and answer, from the part's
     * visible candidates ({@code opts}, the answer's own already added), the
     * answer's visible targets, how many of its targets the seat cannot see, and
     * the part's minimum.  A part that may take no target (minimum 0) lists
     * {@code target:none} first, as {@code attack:none} and {@code block:none}
     * are listed, and carries {@code min: 0}; a part left empty answers
     * {@code target:none} -- never null.  An empty part whose minimum is 1 or more
     * is an engine fault the play will meet ("failed to target"): it answers
     * {@code target:none} too, listed, with {@code min}, {@code complete: false}
     * and {@code why: NO_TARGET}.  A target the seat cannot see is not "none":
     * the record is marked {@code complete: false}, and with no visible target
     * it keeps its null answer, which the checker fails.
     * Engine-free, for the self-test.
     */
    static void targetAnswer(final Decision d, final Set<String> opts, final List<String> chosen, final int unseen,
                             final int min) {
        final List<String> sorted = new ArrayList<>(opts);
        sorted.sort(Decisions::byId);
        final boolean none = chosen.isEmpty() && unseen == 0;
        if (unseen > 0) {
            // D487 review: an answer the seat cannot see is not among the options it was shown, so the record is
            // incomplete -- and an empty visible answer then writes chosen null beside complete:false, never the
            // J171 legacy shape (which has no complete), so the audit fails it
            d.complete = false;
        }
        if (min <= 0 || none) {
            d.options.add(TARGET_NONE);
            d.min = Math.max(min, 0);
            if (min > 0) {
                d.complete = false;
                d.why = NO_TARGET;
            }
        }
        d.options.addAll(sorted);
        if (none) {
            d.chosen = TARGET_NONE;
        } else if (chosen.size() == 1) {
            d.chosen = chosen.get(0);
        } else {
            d.chosenAll.addAll(chosen);
        }
    }

    // ------------------------------------------------------------------
    // Combat
    // ------------------------------------------------------------------

    /** The creatures of {@code ai} that may attack the opposing player (atoms), before or after Forge declared. */
    public static List<Integer> attackers(final Player ai, final Combat combat) {
        return quiet(() -> attackers0(ai, combat));
    }

    private static List<Integer> attackers0(final Player ai, final Combat combat) {
        GameEntity defender = null;
        for (final GameEntity d : combat.getDefenders()) {
            if (d instanceof Player && ((Player) d).isOpponentOf(ai)) {
                defender = d;
                break;
            }
        }
        final List<Integer> able = new ArrayList<>();
        for (final Card c : ai.getCreaturesInPlay()) {
            if (combat.isAttacking(c) || defender != null && CombatUtil.canAttack(c, defender)) {
                able.add(c.getId());
            }
        }
        able.sort(null);
        return able;
    }

    /**
     * An attack decision over {@code atoms}: every subset while there are
     * {@link #MAX_COMBINATIONS} or fewer (each creature is legal alone; the
     * rules that bind a declaration as a whole -- must-attack, attack costs --
     * are not checked, so a listed subset may be illegal as a whole), else a
     * shortlist: none, all, the answer, the answer with one creature more or
     * less, each creature alone.
     */
    public static Decision attack(final Player ai, final List<Integer> atoms, final List<Integer> chosen) {
        final Decision d = base("attack", ai);
        for (final int a : atoms) {
            d.atoms.add(String.valueOf(a));
        }
        final Set<String> opts = new LinkedHashSet<>();
        final int n = atoms.size();
        if (n <= 6 && (1 << n) <= MAX_COMBINATIONS) {
            for (int m = 0; m < 1 << n; m++) {
                final List<Integer> s = new ArrayList<>();
                for (int i = 0; i < n; i++) {
                    if ((m & 1 << i) != 0) {
                        s.add(atoms.get(i));
                    }
                }
                opts.add(Decision.attackToken(s));
            }
        } else {
            d.complete = false;
            opts.add(Decision.attackToken(List.of()));
            opts.add(Decision.attackToken(atoms));
            opts.add(Decision.attackToken(chosen));
            for (final int a : atoms) {
                final List<Integer> s = new ArrayList<>(chosen);
                if (s.contains(a)) {
                    s.remove(Integer.valueOf(a));
                } else {
                    s.add(a);
                }
                opts.add(Decision.attackToken(s));
                opts.add(Decision.attackToken(List.of(a)));
            }
        }
        d.chosen = Decision.attackToken(chosen);
        opts.add(d.chosen);
        d.options.addAll(opts);
        return d;
    }

    /** Every legal single block {blocker, attacker} for {@code ai} against the current attackers (before blocks). */
    public static List<int[]> blockPairs(final Player ai, final Combat combat) {
        return quiet(() -> blockPairs0(ai, combat));
    }

    private static List<int[]> blockPairs0(final Player ai, final Combat combat) {
        final List<int[]> out = new ArrayList<>();
        for (final Card b : ai.getCreaturesInPlay()) {
            if (!CombatUtil.canBlock(b, combat)) {
                continue;
            }
            for (final Card a : combat.getAttackers()) {
                if (CombatUtil.canBlock(a, b, combat)) {
                    out.add(new int[] {b.getId(), a.getId()});
                }
            }
        }
        out.sort((p, q) -> p[1] != q[1] ? Integer.compare(p[1], q[1]) : Integer.compare(p[0], q[0]));
        return out;
    }

    /**
     * A block decision: each blocker blocks one attacker it legally can, or none
     * -- every assignment while their number is at most
     * {@link #MAX_COMBINATIONS} (multi-block requirements, menace and the like
     * are not checked as a whole), else a shortlist: none, the answer, the
     * answer less one block, each single block.
     */
    public static Decision block(final Player ai, final List<int[]> pairs, final List<int[]> chosen) {
        final Decision d = base("block", ai);
        final List<Integer> blockers = new ArrayList<>();
        for (final int[] p : pairs) {
            d.atoms.add(p[0] + ">" + p[1]);
            if (!blockers.contains(p[0])) {
                blockers.add(p[0]);
            }
        }
        blockers.sort(null);
        long combos = 1;
        final List<List<Integer>> choicesOf = new ArrayList<>();
        for (final int b : blockers) {
            final List<Integer> as = new ArrayList<>();
            as.add(-1);
            for (final int[] p : pairs) {
                if (p[0] == b) {
                    as.add(p[1]);
                }
            }
            choicesOf.add(as);
            combos *= as.size();
            if (combos > MAX_COMBINATIONS) {
                break;
            }
        }
        final Set<String> opts = new LinkedHashSet<>();
        if (combos <= MAX_COMBINATIONS) {
            final int[] idx = new int[blockers.size()];
            while (true) {
                final List<int[]> s = new ArrayList<>();
                for (int i = 0; i < idx.length; i++) {
                    final int a = choicesOf.get(i).get(idx[i]);
                    if (a >= 0) {
                        s.add(new int[] {blockers.get(i), a});
                    }
                }
                opts.add(Decision.blockToken(s));
                int i = 0;
                while (i < idx.length && ++idx[i] == choicesOf.get(i).size()) {
                    idx[i] = 0;
                    i++;
                }
                if (i == idx.length) {
                    break;
                }
            }
        } else {
            d.complete = false;
            opts.add(Decision.blockToken(List.of()));
            opts.add(Decision.blockToken(chosen));
            for (final int[] c : chosen) {
                final List<int[]> s = new ArrayList<>(chosen);
                s.remove(c);
                opts.add(Decision.blockToken(s));
            }
            for (final int[] p : pairs) {
                opts.add(Decision.blockToken(List.of(p)));
            }
        }
        d.chosen = Decision.blockToken(chosen);
        if (opts.add(d.chosen)) {
            d.complete = false;   // an answer the enumeration did not foresee (a multi-block)
        }
        d.options.addAll(opts);
        return d;
    }

    /** The blocks {@code ai} has declared, {blocker, attacker}. */
    public static List<int[]> blocksOf(final Player ai, final Combat combat) {
        final List<int[]> out = new ArrayList<>();
        for (final Card a : combat.getAttackers()) {
            for (final Card b : combat.getBlockers(a)) {
                if (b.getController() == ai) {
                    out.add(new int[] {b.getId(), a.getId()});
                }
            }
        }
        return out;
    }

    // ------------------------------------------------------------------
    // Choices
    // ------------------------------------------------------------------

    /** A choice among entities: {@code option:<id>} / {@code option:p<id>}, {@code pass} when it may be declined. */
    public static Decision entities(final Player ai, final Iterable<? extends GameEntity> list, final boolean optional,
                                    final Collection<? extends GameEntity> picked, final String source) {
        final Decision d = base("choice", ai);
        d.source = source;
        final List<String> opts = new ArrayList<>();
        if (list != null) {
            for (final GameEntity e : list) {
                final String t = entityToken("option", e, ai);
                if (t == null) {
                    d.hidden++;
                    if (lastKnown(e)) {
                        System.err.println(lastKnownLine(e.getId()));   // D508: the night's lki_candidates
                    }
                } else if (!opts.contains(t)) {
                    opts.add(t);
                }
            }
        }
        opts.sort(Decisions::byId);
        if (optional) {
            d.options.add("pass");
        }
        d.options.addAll(opts);
        if (d.hidden > 0) {
            d.options.add("option:hidden");
        }
        final List<String> chosen = new ArrayList<>();
        if (picked != null) {
            for (final GameEntity e : picked) {
                if (e == null) {
                    continue;
                }
                final String t = entityToken("option", e, ai);
                chosen.add(t == null ? "option:hidden" : t);
            }
        }
        if (chosen.isEmpty()) {
            d.chosen = "pass";
            if (!d.options.contains("pass")) {
                d.options.add(0, "pass");
            }
        } else if (chosen.size() == 1) {
            d.chosen = chosen.get(0);
        } else {
            d.chosenAll.addAll(chosen);
        }
        return d;
    }

    /** A yes/no question. */
    public static Decision confirm(final Player ai, final boolean yes, final String source) {
        final Decision d = base("choice", ai);
        d.source = source;
        d.options.add("yes");
        d.options.add("no");
        d.chosen = yes ? "yes" : "no";
        return d;
    }

    /** Keep or mulligan. */
    public static Decision mulligan(final Player ai, final boolean keep) {
        final Decision d = base("mulligan", ai);
        d.options.add("keep");
        d.options.add("mulligan");
        d.chosen = keep ? "keep" : "mulligan";
        return d;
    }

    /** The search's report as the record's {@code search} block. */
    public static Decision.SearchStats stats(final SearchPolicy.Report r) {
        final Decision.SearchStats s = new Decision.SearchStats();
        for (int i = 0; i < r.cands.size(); i++) {
            s.tokens.add(SearchPolicy.token(r.cands.get(i)));
            s.n.add(i < r.n.length ? r.n[i] : 0);
            s.meanLeaf.add(at(r.meanLeaf, i));
            s.seLeaf.add(at(r.seLeaf, i));
            s.diffLeaf.add(at(r.diffLeaf, i));
            s.seDiff.add(at(r.seDiff, i));
            s.win.add(at(r.win, i));
            s.prior.add(at(r.prior, i));
        }
        s.generated = r.generated;
        s.horizon = r.horizon;
        s.rule = r.rule;
        s.margin = r.margin;
        s.z = r.z;
        s.stat = r.stat;
        s.forge = 0;
        s.best = r.best;
        s.rounds = r.rounds;
        s.playouts = r.playouts;
        s.ms = r.ms;
        s.budgetMs = r.budgetMs;
        s.timedOut = r.timedOut;
        s.fallback = r.fallback;
        s.overrode = r.overrode;
        return s;
    }

    private static double at(final double[] a, final int i) {
        return i < a.length ? a[i] : Double.NaN;
    }
}
