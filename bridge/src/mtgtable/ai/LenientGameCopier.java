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

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.commons.lang3.tuple.Pair;

import forge.ai.simulation.GameCopier;
import forge.card.GamePieceType;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.GameObject;
import forge.game.card.Card;
import forge.game.card.CardCopyService;
import forge.game.card.CardCollection;
import forge.game.card.CardFactory;
import forge.game.card.token.TokenInfo;
import forge.game.phase.PhaseType;
import forge.game.player.Player;
import forge.game.replacement.ReplacementEffect;
import forge.game.spellability.SpellAbility;
import forge.game.trigger.Trigger;
import forge.game.trigger.TriggerHandler;
import forge.game.trigger.TriggerType;
import forge.game.zone.Zone;
import forge.game.zone.ZoneType;
import forge.item.IPaperCard;

/**
 * Forge's {@link GameCopier} with the one failure that ends simulated cube
 * games worked around (D313).
 *
 * <p><b>The failure.</b> {@code GameCopier.makeCopy} copies the cards of seven
 * zones (battlefield, hand, graveyard, library, exile, stack, command) and then
 * re-maps every live {@code StaticEffect} of the original game onto the copy
 * ({@code StaticEffect.removeMapped}), which maps the effect's source and every
 * card it affects through {@link #find}.  A static ability that works in every
 * zone -- a characteristic-defining ability (Tarmogoyf's P/T), Grist's "isn't a
 * planeswalker unless on the battlefield", Anax's, Hero of Light's -- also
 * affects that card while it sits in the <b>sideboard</b>, a zone the copier
 * never copies; {@code find} then throws {@code Couldn't map <card>}.  A Forge
 * built cube deck has fifteen-odd sideboard cards, so this happens in most cube
 * games (D311: 15 of 20 games under Forge's own full simulation).
 *
 * <p><b>The workaround.</b> While the copy is being made, a card the copier did
 * not copy and that sits in a zone it never copies (or in no zone at all) maps
 * to a throwaway stand-in card that belongs to the copy and lives in no zone.
 * {@code removeMapped} only strips the effect's layers from the cards it maps
 * (and the copy re-applies every static itself in {@code checkStateEffects}),
 * so stripping them from a stand-in is a no-op: the copy is the game it would
 * have been had the sideboard not been affected.  Cards in the seven copied
 * zones still go through Forge's own strict lookup first (one that fails all
 * the same -- a token the zone's listing skips -- gets a stand-in too, marked
 * {@code ?} in {@link #unmappedNames}), and after the copy is made every lookup
 * is strict again.  Every stand-in is counted ({@link #unmapped}),
 * and the bench reports the rate.
 *
 * <p><b>A stale effect card maps to nothing</b> (D474).  A player who loses
 * the monarch (or the initiative, ...) keeps its effect card in a field after
 * {@code Zone.remove} has taken it out of the command zone -- and the card
 * still names that zone ({@code Zone.remove} never clears it).
 * {@code Player.copyEffectCardsToSnapshot} maps the field unless the card is
 * in no zone; the strict lookup fails on it, and a stand-in -- a card with no
 * owner and no triggers -- became the copied player's effect card.  When that
 * player became the monarch again in the copy, {@code createMonarchEffect}
 * put the stand-in into the command zone and the view's flashback scan threw
 * {@code NullPointerException} on its null controller (J161's d41).  Such a
 * card maps to null: the field stays unset and the copy makes a fresh effect
 * when it needs one, which is what {@code mapEffectCard} does for an effect
 * in no zone.
 *
 * <p><b>What the copy carries after it is made</b> (D479, amending D313).
 * {@code GameCopier} builds an effect card (and any other card it cannot
 * rebuild from a paper card) from its name, type, static and spell abilities
 * only, sets an effect source only on the battlefield, and drops every
 * "exiled with" link ({@code // TODO ExiledWith}).  On a fork that left a
 * copied effect with no triggers (The Monarch drew nothing), no replacement
 * effects (Gideon's "prevent all damage dealt to him" prevented nothing) and a
 * null source, and a card on an adventure was not on one.  After Forge's copy
 * is made, {@link #carry} gives each copied card what its original has, with
 * every object it names mapped onto the copy:
 * <ul>
 *   <li>its game and layer timestamps (Forge sets them on the battlefield only);</li>
 *   <li>for a card built from its traits: its SVars, triggers and replacement
 *       effects ({@code copy(host, true)}, as Forge copies its statics), except a
 *       trigger that holds game objects of its own, which is left out and counted;</li>
 *   <li>its effect source ({@link #effectSourceNull} counts an effect card whose
 *       source the copy cannot name);</li>
 *   <li>its exile link: the card it was exiled with and the player who exiled it,
 *       and, for a host, the cards exiled with it ({@link #exileLinksLost}).</li>
 * </ul>
 * A linked object that is the card a copied zone holds maps to that card's
 * copy.  One that is an older object of the same card (a spell's object on the
 * stack, which an adventure's link and an effect's source both name after it
 * resolved) maps to a <i>mirror</i>: a copy, in no zone, of the copied card with
 * that id, turned to the old object's face and given its timestamps and its
 * zone -- what the original game holds too.  A card the copy holds under no
 * such id maps to nothing and is counted.
 *
 * <p><b>The mirror's zone</b> (D479's follow-up).  {@code CardCopyService.copyCard}
 * gives the mirror the live copied card's zone.  The old object names a zone
 * of its own: {@code GameAction.changeZone} sets the moved object's zone to
 * its destination ({@code c.setZone(zoneTo)}) and nothing clears it, so after
 * a spell resolves its stack object names the zone the card went to, and
 * keeps naming it after the card moves on.  The mirror names the copy's zone
 * of that kind (the same player's, or the stack), so an effect source's
 * {@code isInZone}/{@code isInPlay} reads what the original's does -- never
 * null, which the original's object is not.
 *
 * <p><b>What a card may be cast for</b> (D493, amending D479).
 * {@code GameActionUtil.getAlternativeCosts} builds a card's "(Plotted)" cast
 * from {@code isPlotted()} and its "(Foretold)" cast from {@code isForetold()},
 * each only when {@code !enteredThisTurn()}.  {@code GameCopier} copies the
 * foretold flags but not the plotted one, and its {@code Zone.add} stamps every
 * copied card with the copy's own turn as the turn it entered its zone, so on
 * a copy every card "entered this turn": a card plotted or foretold on an
 * earlier turn had no such cast, and the atlas's forced cast of one threw in
 * {@code SearchPolicy.mapSa} (J176's s10, d7: 150 of 150 branches).  The carry
 * pass sets the plotted flag (with the copy's {@code BecomesPlotted} triggers
 * held, because the plot happened in the original game) and, for a card on the
 * battlefield, in a graveyard, in exile, on the stack or in the command zone,
 * the turn it entered that zone.  A card in a hand or a library
 * keeps the copy's turn: those are the zones the Determinizer redeals, and a
 * real turn there would mark which redealt card came from the hand.
 *
 * <p><b>A token's paper card</b> (D497).  {@code GameCopier} re-makes every
 * token with {@code TokenInfo.makeOneToken}, which builds it with
 * {@code new Card(id, game)}: no paper card.  A token the live game made from
 * a token script carries one (a {@code PaperToken}), and
 * {@code Card.getPaperCard()} finds nothing by a token's name in the card
 * databases, so on a copy it returned null for every such token -- and every
 * {@code CopyPermanent} effect whose original was one threw
 * {@code NullPointerException} in {@code CardFactory.readCard} (Reflection of
 * Kiki-Jiki copying a Goblin Shaman token, J180's s11, d18 and d19).  The
 * carry pass gives each re-made token its original's paper card, field to
 * field, before anything else it carries.  {@code Card.paperCard} is
 * {@code private final} with no setter in the pinned jar, so this is the one
 * reflective write of a Forge field the lint allows (its rule
 * {@code forge-field-write}); on an engine where the field is not there,
 * nothing is written and {@link #paperCardsLost} counts each token.
 *
 * <p><b>Who dealt the damage this turn</b> (D500, D497's sibling).  Every
 * damage instance is a {@code Pair<amount, combat>} that the target keeps in
 * {@code damageReceivedThisTurn} and the game keys, by identity, to the last
 * known source and target in {@code damageThisTurnLKI}
 * ({@code CardDamageHistory.registerDamage} -&gt; {@code Game.addGlobalDamageHistory}).
 * {@code GameCopier} copies a player's and a battlefield card's list -- the
 * same pair objects -- but never the game's map, so on a fork made after
 * damage was dealt every {@code DamagedBy}/{@code Damaged} card property
 * (and {@code getAssignedDamage} with a source) dereferenced
 * {@code getDamageLKI(pair)} as null: Etching of Kumano's replacement
 * ("if a creature dealt damage this turn by a source you controlled would
 * die") on a Colossal Skyturtle blocked earlier in the turn, J181's s06, d19.
 * {@link #carryDamageLki} gives the copy an entry for every pair its
 * entities hold, through the public {@code addGlobalDamageHistory}: the
 * source and the target are last-known copies, on the copy, of the copy's
 * card with the original's id (its current characteristics), with the
 * original entry's timestamps, so {@code equalsWithGameTimestamp} answers
 * what it answers in the original; a player maps to the copy's player; a
 * card the copy holds no card of (a token that has ceased to exist) is
 * rebuilt in the copy from the original's last-known object, as
 * {@code GameCopier} rebuilds a card.  The history it is filed
 * under is the copied source's own, which {@code GameCopier} leaves empty,
 * so no count of damage done changes.  A pair that cannot be given an entry
 * is taken off the copy's list and named in {@link #damageLkiLost}.
 */
public final class LenientGameCopier extends GameCopier {

    /** The zones {@code GameCopier} copies (its private {@code ZONES}, 2.0.14). */
    static final Set<ZoneType> COPIED = Set.of(ZoneType.Battlefield, ZoneType.Hand, ZoneType.Graveyard,
            ZoneType.Library, ZoneType.Exile, ZoneType.Stack, ZoneType.Command);

    /**
     * D493: the zones whose cards get their original's turn in the zone: the
     * public ones.  A hand and a library (the Determinizer's zones) keep the
     * copy's turn, and so does any other zone (a sideboard: uniform, never
     * redealt, never read).
     */
    static final Set<ZoneType> ZONE_TURN_CARRIED = Set.of(ZoneType.Battlefield, ZoneType.Graveyard, ZoneType.Exile,
            ZoneType.Stack, ZoneType.Command);

    private boolean copying;
    private final Map<Card, Card> standIns = new HashMap<>();
    private final List<String> unmappedNames = new ArrayList<>();
    private final List<String> staleEffects = new ArrayList<>();
    /** D479: older objects of a copied card, by the original object, each mirrored once per copy. */
    private final Map<Card, Card> mirrors = new IdentityHashMap<>();
    private final List<String> effectSourceNull = new ArrayList<>();
    private final List<String> exileLinksLost = new ArrayList<>();
    private final List<String> traitsLeft = new ArrayList<>();
    private int traitsCarried;
    private int linksCarried;
    private int plainTimestampsMoved;
    private int plottedCarried;
    private int zoneTurnsCarried;
    private int paperCardsCarried;
    private final List<String> paperCardsLost = new ArrayList<>();
    /** D500: the game being copied ({@code GameCopier}'s own field is private). */
    private final Game orig;
    private int damageLkiCarried;
    private int damageLkiRebuilt;
    private final List<String> damageLkiLost = new ArrayList<>();
    /** D500: the original last-known cards no copy could be made of, with the exception's class. */
    private final Map<Card, String> failures = new IdentityHashMap<>();
    /** D544: whether {@link #makeCopy} carries the stack ({@link #carryStack(boolean)}); off, a copy is what it was. */
    private boolean carryStack;
    /** D544: the searching seat of the copy being carried (the copier's {@code aiPlayer}; null when none was given). */
    private Player seat;
    /** D544: each live stack item's spell ability, by identity, to the one on the copy's stack. */
    private final Map<SpellAbility, SpellAbility> stackMap = new IdentityHashMap<>();
    /** D544: the copy's cards by id, and the last-known cards the carry rebuilt (a sacrificed token), by the original. */
    private Map<Integer, Card> stackById;
    private final Map<Card, Card> stackLki = new IdentityHashMap<>();
    /**
     * D497: {@code Card.paperCard}, the field {@link #carryPaperCard} writes
     * (null when this engine has no such field of type {@code IPaperCard}).
     */
    private static final Field PAPER_CARD = paperCardField();
    /** D497: whether a refused write has been said on stderr (once per JVM). */
    private static final java.util.concurrent.atomic.AtomicBoolean WRITE_REFUSED_SAID =
            new java.util.concurrent.atomic.AtomicBoolean();

    /** D479's follow-up, for the self-test only: false leaves a plain card with the timestamps Forge gave it. */
    private static volatile boolean carryPlainTimestamps = true;

    public LenientGameCopier(final Game origGame) {
        super(origGame);
        this.orig = origGame;
    }

    /** How many cards were mapped to a stand-in while copying. */
    public int unmapped() {
        return standIns.size();
    }

    /** Their names and zones, for the bench's log (the AI's own knowledge: its sideboard, or a public card). */
    public List<String> unmappedNames() {
        return unmappedNames;
    }

    /** D474: the effect cards a player still held out of their zone, mapped to nothing (name@zone). */
    public List<String> staleEffects() {
        return staleEffects;
    }

    /** D479: the effect cards whose original names a source the copy could not map (name &lt;- source). */
    public List<String> effectSourceNull() {
        return effectSourceNull;
    }

    /** D479: the exile links the copy could not map: a card's "exiled with", or a host's exiled card. */
    public List<String> exileLinksLost() {
        return exileLinksLost;
    }

    /** D479: the triggers left off a copied card because they hold game objects of their own. */
    public List<String> traitsLeft() {
        return traitsLeft;
    }

    /** D479: how many triggers and replacement effects the carry pass copied onto cards built from their traits. */
    public int traitsCarried() {
        return traitsCarried;
    }

    /** D479: how many effect sources and exile links the carry pass set on the copy. */
    public int linksCarried() {
        return linksCarried;
    }

    /**
     * D479's follow-up: how many plain cards (not built from their traits:
     * every card with a paper card, and every token) had timestamps other than
     * their original's before the carry pass -- Forge sets them on the
     * battlefield only, so these are the cards in the other zones.  Counted
     * whether or not {@link #carryPlainTimestampsForTest} carries them.
     */
    public int plainTimestampsMoved() {
        return plainTimestampsMoved;
    }

    /** D493: how many copied cards were given their original's plotted flag (Forge's copier sets none). */
    public int plottedCarried() {
        return plottedCarried;
    }

    /** D493: how many copied cards in a public zone were given the turn their original entered it. */
    public int zoneTurnsCarried() {
        return zoneTurnsCarried;
    }

    /** D497: how many re-made tokens were given their original's paper card. */
    public int paperCardsCarried() {
        return paperCardsCarried;
    }

    /** D497: the re-made tokens whose original has a paper card the copy could not be given (their names). */
    public List<String> paperCardsLost() {
        return paperCardsLost;
    }

    /** D500: how many damage instances of the copy were given their source and target (one per pair). */
    public int damageLkiCarried() {
        return damageLkiCarried;
    }

    /** D500: how many last-known sources and targets were rebuilt because the copy holds no card with their id. */
    public int damageLkiRebuilt() {
        return damageLkiRebuilt;
    }

    /**
     * D500: the damage instances taken off the copy because no source or target
     * could be given (amount, entity, source, and why: the exception's class, or
     * "not rebuilt" for a card with neither a token's script nor a paper card).
     * The atlas row and the search sink carry its size, once per copy.
     */
    public List<String> damageLkiLost() {
        return damageLkiLost;
    }

    /** D497: true when the paper-card field was found (the self-test asserts it). */
    public static boolean paperCardWritable() {
        return PAPER_CARD != null;
    }

    /**
     * For the self-test only (D479's follow-up): false makes every copy leave
     * a plain card with the timestamps Forge gave it, as before D479, so a
     * plain fork can be played both ways.  An effect card's are carried
     * either way.  Production never calls it.
     */
    public static void carryPlainTimestampsForTest(final boolean on) {
        carryPlainTimestamps = on;
    }

    /**
     * The copy, then (D479) {@link #carry}.  No caller advances the copy to a
     * phase, and the carry pass must run before anything is played on it, so
     * {@code advanceToPhase} must be null.
     */
    @Override
    public Game makeCopy(final PhaseType advanceToPhase, final Player aiPlayer) {
        if (advanceToPhase != null) {
            throw new IllegalArgumentException("LenientGameCopier copies the game as it stands (D479): advanceToPhase must be null");
        }
        final Game copy;
        copying = true;
        try {
            copy = super.makeCopy(null, aiPlayer);
        } finally {
            copying = false;
        }
        carry(copy);
        if (carryStack) {
            carryStackItems(copy, aiPlayer);   // D544: only when the search asks, so every other copy is what it was
        }
        return copy;
    }

    /**
     * D479: what {@code GameCopier} leaves off a copied card, set after every
     * card of the copy exists (a link may name any of them).  Then the copy's
     * statics are applied again (a static may read an effect's source) and its
     * active triggers collected again (the carried ones among them).
     */
    private void carry(final Game copy) {
        final Map<Card, Card> live = new IdentityHashMap<>();   // an original card object -> its copy
        final Map<Integer, Card> byId = new HashMap<>();
        for (final Card c : copy.getCardsInGame()) {
            final GameObject o = reverseFind(c);
            if (o instanceof Card) {
                live.put((Card) o, c);
            }
            byId.put(c.getId(), c);
        }
        for (final Map.Entry<Card, Card> e : live.entrySet()) {
            carryPaperCard(e.getKey(), e.getValue());   // D497: first, so a mirror copied from a token has it too
        }
        final int carriedBefore = traitsCarried + linksCarried + plottedCarried + zoneTurnsCarried;
        for (final Map.Entry<Card, Card> e : live.entrySet()) {
            final Card o = e.getKey();
            final Card c = e.getValue();
            final boolean traits = builtFromTraits(o);
            if (c.getGameTimestamp() != o.getGameTimestamp() || c.getLayerTimestamp() != o.getLayerTimestamp()) {
                if (!traits) {
                    plainTimestampsMoved++;
                }
                if (traits || carryPlainTimestamps) {
                    c.setGameTimestamp(o.getGameTimestamp());
                    c.setLayerTimestamp(o.getLayerTimestamp());
                }
            }
            if (traits) {
                carryTraits(o, c);
            }
            carryCastability(copy, o, c);
            final Card src = o.getEffectSource();
            if (src != null && c.getEffectSource() == null) {
                final Card m = link(src, live, byId);
                if (m != null) {
                    c.setEffectSource(m);
                    linksCarried++;
                } else if (o.getGamePieceType() == GamePieceType.EFFECT) {
                    effectSourceNull.add(o.getName() + " <- " + src.getName());
                }
            }
            final Card with = o.getExiledWith();
            if (with != null) {
                final Card m = link(with, live, byId);
                if (m != null) {
                    c.setExiledWith(m);
                    c.setExiledBy(o.getExiledBy() == null ? null : (Player) find(o.getExiledBy()));
                    linksCarried++;
                } else {
                    exileLinksLost.add(o.getName() + " exiled with " + with.getName());
                }
            }
            for (final Card x : o.getExiledCards()) {
                Card m = live.get(x);
                if (m == null) {
                    m = byId.get(x.getId());   // the host's list compares by id, as Forge's equals does
                }
                if (m != null) {
                    c.addExiledCard(m);
                    linksCarried++;
                } else {
                    exileLinksLost.add(x.getName() + " exiled with host " + o.getName());
                }
            }
        }
        if (traitsCarried + linksCarried + plottedCarried + zoneTurnsCarried > carriedBefore) {
            copy.getAction().checkStaticAbilities();
            copy.getTriggerHandler().resetActiveTriggers();
        }
        carryDamageLki(copy, byId);   // D500: last, so a last-known copy sees the copy's statics applied
    }

    /**
     * D500: an entry in the copy's {@code damageThisTurnLKI} for every damage
     * instance a copied player or card holds, built from the original game's
     * entry for the same pair object.  Read on the thread that made the copy,
     * as every other original object {@link #carry} reads.
     */
    private void carryDamageLki(final Game copy, final Map<Integer, Card> byId) {
        final Map<Card, Card> done = new IdentityHashMap<>();   // an original last-known card -> the copy's
        final List<GameEntity> entities = new ArrayList<>(copy.getPlayers());
        for (final Card c : copy.getCardsInGame()) {
            entities.add(c);
        }
        for (final GameEntity e : entities) {
            for (final Iterator<Pair<Integer, Boolean>> it = e.getDamageReceivedThisTurn().iterator(); it.hasNext();) {
                final Pair<Integer, Boolean> p = it.next();
                if (copy.getDamageLKI(p) != null) {
                    continue;
                }
                final Pair<Card, GameEntity> o = orig.getDamageLKI(p);
                Card src = null;
                GameEntity tgt = null;
                if (o != null) {
                    src = o.getLeft() == null ? null : lkiOnCopy(copy, o.getLeft(), byId, done);
                    tgt = o.getRight() instanceof Card ? lkiOnCopy(copy, (Card) o.getRight(), byId, done)
                            : o.getRight() instanceof Player ? playerOnCopy((Player) o.getRight()) : null;
                }
                if (src == null || tgt == null) {
                    // the copy never reads a pair it does not hold: off its list, and said
                    it.remove();
                    String why = o == null ? "no entry in the original" : src == null ? failures.get(o.getLeft()) : null;
                    if (why == null && o != null && o.getRight() instanceof Card) {
                        why = failures.get(o.getRight());
                    }
                    damageLkiLost.add(p.getLeft() + (p.getRight() ? " combat" : "") + " to " + e
                            + (o == null ? "" : " from " + o.getLeft()) + " (" + (why == null ? "not rebuilt" : why) + ")");
                    continue;
                }
                copy.addGlobalDamageHistory(src.getDamageHistory(), p, src, tgt);
                damageLkiCarried++;
            }
        }
    }

    /** D500: the copy's player for an original one (null when the copier has none). */
    private Player playerOnCopy(final Player p) {
        try {
            final GameObject m = find(p);
            return m instanceof Player ? (Player) m : null;
        } catch (final RuntimeException e) {
            return null;
        }
    }

    /**
     * D500: the copy's last-known object for {@code o}, an original game's
     * last-known card: a last-known copy of the copy's card with {@code o}'s
     * id, else a card rebuilt on the copy from {@code o} (a token that has
     * ceased to exist), either one given {@code o}'s timestamps.  Null when
     * neither can be made.
     */
    private Card lkiOnCopy(final Game copy, final Card o, final Map<Integer, Card> byId, final Map<Card, Card> done) {
        if (done.containsKey(o)) {
            return done.get(o);
        }
        Card out = null;
        try {
            final Card base = byId.get(o.getId());
            if (base != null) {
                out = CardCopyService.getLKICopy(base);
                // the controller as of the damage, not as of now (a creature stolen, used and sacrificed, or
                // damaged and then stolen): DamagedByCard.YouCtrl asks it.  Its characteristics stay the copy's.
                final Player octl = o.getController() == null ? null : playerOnCopy(o.getController());
                if (octl != null && octl != out.getController()) {
                    out.setController(octl, 0);
                }
            } else {
                // built in the copy from the start, as GameCopier.createCardCopy builds a card: never a
                // CardCopyService(o, copy).copyCard, whose token branch makes the card (and its view) in o's game
                final Player owner = o.getOwner() == null ? null : playerOnCopy(o.getOwner());
                if (owner != null && o.isToken() && !o.isImmutable()) {
                    out = new TokenInfo(o).makeOneToken(owner, o.getId());
                    new CardCopyService(o).copyCopiableCharacteristics(out, null, null);
                } else if (owner != null && !o.isImmutable() && o.getPaperCard() != null) {
                    out = CardFactory.getCard(o.getPaperCard(), owner, o.getId(), copy);
                    if (out.hasState(o.getCurrentStateName())) {
                        out.setState(o.getCurrentStateName(), true);
                    }
                }
                if (out != null) {
                    final Player ctl = o.getController() == null ? null : playerOnCopy(o.getController());
                    if (ctl != null && ctl != owner) {
                        out.setController(ctl, 0);
                    }
                    damageLkiRebuilt++;
                }
            }
            if (out != null) {
                out.setGameTimestamp(o.getGameTimestamp());
                out.setLayerTimestamp(o.getLayerTimestamp());
            }
        } catch (final RuntimeException e) {
            out = null;
            failures.put(o, e.getClass().getName());
        }
        done.put(o, out);
        return out;
    }

    /**
     * D493: what {@code GameActionUtil.getAlternativeCosts} reads off a card
     * that {@code GameCopier} leaves off or resets: the plotted flag, and the
     * turn the card entered its zone ({@code enteredThisTurn()}), which the
     * copier's {@code Zone.add} sets to the copy's turn.  The turn is carried
     * in the public zones only ({@link #ZONE_TURN_CARRIED}): never in a hand or
     * a library, the Determinizer's zones.  Either
     * one makes {@link #carry} apply the statics again: a static may read the
     * turn ({@code ThisTurnEntered}: Warp's "you may cast it from exile on a
     * later turn" is one), and Forge's copy applied them with the copy's.
     */
    private void carryCastability(final Game copy, final Card o, final Card c) {
        if (c.isPlotted() != o.isPlotted()) {
            // Card.setPlotted(true) runs BecomesPlotted: the plot is the original game's, not an event of the copy
            final TriggerHandler th = copy.getTriggerHandler();
            final boolean held = th.isTriggerSuppressed(TriggerType.BecomesPlotted);
            if (!held) {
                th.suppressMode(TriggerType.BecomesPlotted);
            }
            try {
                c.setPlotted(o.isPlotted());
            } finally {
                if (!held) {
                    th.clearSuppression(TriggerType.BecomesPlotted);
                }
            }
            plottedCarried++;
        }
        final Zone z = c.getZone();
        if (z != null && ZONE_TURN_CARRIED.contains(z.getZoneType()) && c.getTurnInZone() != o.getTurnInZone()) {
            c.setTurnInZone(o.getTurnInZone());
            zoneTurnsCarried++;
        }
    }

    /**
     * D497: a token {@code GameCopier.createCardCopy} re-made from its
     * {@code TokenInfo} (a token that is not immutable) gets its original's
     * paper card when the copy's field is empty and the original's is not.
     * Field to field: {@code getPaperCard()} would fall back to up to four
     * card-database lookups for every token of every fork, and would let a
     * script token named like a printed card (Llanowar Mentor's Llanowar
     * Elves) answer with the printed card where the live token answers with
     * its script.  A token the live game holds with no paper card (only
     * {@code GameState}'s {@code t:} tokens are) stays as its original is.
     */
    private void carryPaperCard(final Card o, final Card c) {
        if (!o.isToken() || o.isImmutable()) {
            return;
        }
        if (PAPER_CARD == null) {
            if (c.getPaperCard() == null && o.getPaperCard() != null) {
                paperCardsLost.add(o.getName());
            }
            return;
        }
        try {
            if (PAPER_CARD.get(c) != null) {
                return;
            }
            final Object pc = PAPER_CARD.get(o);
            if (pc == null) {
                return;
            }
            PAPER_CARD.set(c, pc);
            paperCardsCarried++;
        } catch (final IllegalAccessException | RuntimeException e) {
            paperCardsLost.add(o.getName());
            if (!WRITE_REFUSED_SAID.getAndSet(true)) {
                // once per JVM, and no card name: a JDK that refuses final-field writes shows in the worker log
                System.err.println("COPIER: the write of Card.paperCard was refused (" + e.getClass().getName()
                        + "); forked tokens keep no paper card and a copy of one cannot be made (D497)");
            }
        }
    }

    private static Field paperCardField() {
        try {
            final Field f = Card.class.getDeclaredField("paperCard");   // ALLOW paperCard write: D497
            if (f.getType() != IPaperCard.class) {
                throw new NoSuchFieldException("Card.paperCard is a " + f.getType().getName() + ", not an IPaperCard");
            }
            f.setAccessible(true);
            return f;
        } catch (final ReflectiveOperationException | RuntimeException e) {
            System.err.println("COPIER: Card.paperCard is not writable on this engine (" + e
                    + "); a forked token keeps no paper card and a copy of it cannot be made (D497)");
            return null;
        }
    }

    /** The cards {@code GameCopier.createCardCopy} builds from name, type, statics and spells (2.0.14). */
    private static boolean builtFromTraits(final Card o) {
        return o.isImmutable() || (!o.isToken() && o.getPaperCard() == null);
    }

    private void carryTraits(final Card o, final Card c) {
        if (c.getSVars().isEmpty() && !o.getSVars().isEmpty()) {
            c.setSVars(o.getSVars());
        }
        if (c.getTriggers().isEmpty()) {
            for (final Trigger t : o.getTriggers()) {
                if (!t.getTriggerRemembered().isEmpty() || t.getSpawningAbility() != null) {
                    traitsLeft.add(o.getName() + ": " + t);   // its own objects are the original game's
                    continue;
                }
                final Trigger tc = t.copy(c, true);
                ownActivator(tc.getOverridingAbility());
                c.addTrigger(tc);
                traitsCarried++;
            }
        }
        if (c.getReplacementEffects().isEmpty()) {
            for (final ReplacementEffect r : o.getReplacementEffects()) {
                final ReplacementEffect rc = r.copy(c, true);
                ownActivator(rc.getOverridingAbility());
                c.addReplacementEffect(rc);
                traitsCarried++;
            }
        }
    }

    /** A copied ability keeps its activating player; the copy's own player replaces the original's. */
    private void ownActivator(final SpellAbility sa) {
        if (sa != null && sa.getActivatingPlayer() != null && sa.getActivatingPlayer().getGame() != getCopiedGame()) {
            sa.setActivatingPlayer((Player) find(sa.getActivatingPlayer()));
        }
    }

    /**
     * The copy's object for {@code o}, a card named by another card's link: the
     * copy of the card a copied zone holds as {@code o}, else a mirror of the
     * copied card with {@code o}'s id (null when there is none).
     */
    private Card link(final Card o, final Map<Card, Card> live, final Map<Integer, Card> byId) {
        final Card same = live.get(o);
        if (same != null) {
            return same;
        }
        final Card done = mirrors.get(o);
        if (done != null) {
            return done;
        }
        final Card base = byId.get(o.getId());
        if (base == null) {
            return null;
        }
        final Card mirror = new CardCopyService(base).copyCard(false);
        if (mirror.hasState(o.getCurrentStateName())) {
            mirror.setState(o.getCurrentStateName(), true);
        }
        mirror.setGameTimestamp(o.getGameTimestamp());
        mirror.setLayerTimestamp(o.getLayerTimestamp());
        mirror.setTurnInZone(o.getTurnInZone());   // D493: the old object's, as its timestamps
        mirror.setZone(zoneOnCopy(base.getGame(), o.getZone()));   // copyCard gave it the live card's
        mirrors.put(o, mirror);
        return mirror;
    }

    /** The copy's zone of {@code z}'s kind: the same player's, or the stack; null for null (or a zone it has no such). */
    private Zone zoneOnCopy(final Game copy, final Zone z) {
        if (z == null) {
            return null;
        }
        if (z.getPlayer() == null) {
            return z.is(ZoneType.Stack) ? copy.getStackZone() : null;
        }
        final GameObject p = find(z.getPlayer());
        return p instanceof Player ? ((Player) p).getZone(z.getZoneType()) : null;
    }

    @Override
    public GameObject find(final GameObject o) {
        if (o instanceof SpellAbility && !stackMap.isEmpty()) {
            // D544: a spell or ability on the live stack (a counter's target) is the carried item; anything else
            // throws below, as it always did
            final SpellAbility m = stackMap.get(o);
            if (m != null) {
                return m;
            }
        }
        if (copying && o instanceof Card) {
            final Card c = (Card) o;
            final ZoneType z = c.getZone() == null ? null : c.getZone().getZoneType();
            if (z == null || !COPIED.contains(z)) {
                return standIn(c, String.valueOf(z));
            }
            if (z == ZoneType.Command && c.getGamePieceType() == GamePieceType.EFFECT && !c.getZone().contains(c)) {
                // D474: an effect card its zone no longer holds is in no zone -- not part of the copy
                staleEffects.add(c.getName() + "@" + z);
                return null;
            }
            try {
                return super.find(o);
            } catch (final RuntimeException e) {
                // A card in a copied zone that the copier still did not copy: the
                // bench met a Bird token (11 of 5,017 searched decisions before
                // this branch) -- a card the zone's getCardsIn does not list, as a
                // phased-out permanent is not.  The same stand-in, counted apart.
                if (!String.valueOf(e.getMessage()).startsWith("Couldn't map")) {
                    throw e;
                }
                return standIn(c, z + "?");
            }
        }
        return super.find(o);
    }

    private Card standIn(final Card c, final String where) {
        return standIns.computeIfAbsent(c, k -> {
            unmappedNames.add(k.getName() + "@" + where);
            return new Card(k.getId(), k.getPaperCard(), getCopiedGame());
        });
    }

    // ==================================================================
    // D544: the stack carry
    // ==================================================================

    /**
     * D544: the cast and target triggers held while the carry pushes an item (they fired in the live game already);
     * the skeptic's read added {@code CommitCrime}, which {@code MagicStack.add} runs through {@code Player.commitCrime}.
     */
    private static final TriggerType[] HELD = {TriggerType.SpellCast, TriggerType.SpellAbilityCast, TriggerType.AbilityCast,
            TriggerType.SpellCastOrCopy, TriggerType.SpellCopy, TriggerType.SpellAbilityCopy, TriggerType.BecomesTarget,
            TriggerType.BecomesTargetOnce, TriggerType.Crewed, TriggerType.BecomesCrewed, TriggerType.Saddled,
            TriggerType.BecomesSaddled, TriggerType.Stationed, TriggerType.Cycled, TriggerType.Waterbend,
            TriggerType.CommitCrime};

    /**
     * D544 (the skeptic's read): a refusal's detail is built from ids and reason words only, never a card's name.
     * This is a check of characters, not of names (a name of plain letters would pass it): it drops a detail that
     * carries anything else, and every site that builds one must keep names out itself.
     */
    static final java.util.regex.Pattern DETAIL_CHARS = java.util.regex.Pattern.compile("^[a-zA-Z0-9 :=,._-]*$");

    /**
     * D544: the stack items' effects that read the mana spent on them -- a value the carry does not rebuild (a
     * rebuilt item has paid no mana, and the live item's {@code Mana} records name the live game's players).  A
     * text scan of the source's SVars and every part's parameters; a hit refuses the window ({@code manaSpent}).
     */
    private static final java.util.regex.Pattern MANA_SPENT = java.util.regex.Pattern.compile(
            "(?i)converge|adamant|sunburst|manaspent|colorsspent|spentmana|manafrom|snowmana|castmanaspent|expend");

    /**
     * D544: the stack carry is refused for this window; {@link #reason} is the counter's suffix
     * ({@code search.p.stackwin.refused.<reason>}).  Thrown out of {@link #makeCopy} only when the carry was asked.
     * {@link #detail} names cards by id only (the skeptic's read: it reaches the search's event stream through
     * {@code CopyFailed}); a detail with any character outside {@link #DETAIL_CHARS} is replaced by its reason.
     */
    public static final class StackRefused extends RuntimeException {
        private static final long serialVersionUID = 1L;
        public final String reason;
        public final String detail;

        StackRefused(final String reason, final String detail) {
            super("stack carry refused (" + reason + "): " + clean(reason, detail));
            this.reason = reason;
            this.detail = clean(reason, detail);
        }

        private static String clean(final String reason, final String detail) {
            return detail != null && DETAIL_CHARS.matcher(detail).matches() ? detail : "refused " + reason;
        }
    }

    /**
     * D544: carry the live stack onto every copy this copier makes (the search's stack windows only, under
     * {@code stackwin=1}).  Off by default: a copy is then exactly what it was, a non-empty stack included.
     */
    public LenientGameCopier carryStack(final boolean on) {
        this.carryStack = on;
        return this;
    }

    /** D544: the copy's item for a live stack item's spell ability (null when the stack was not carried or it is not there). */
    public SpellAbility stackItemOnCopy(final SpellAbility live) {
        return stackMap.get(live);
    }

    /**
     * D544: why the live stack cannot be carried at all, read on the live game before any copy (null: it may be).
     * Simultaneous stack entries waiting to be ordered ({@code waiting}), a frozen stack ({@code frozen}), a stack
     * that is resolving ({@code resolving}), a split second item ({@code splitSecond}), any face-down item -- a
     * face-down spell or an ability of a face-down card: a copy would rebuild it face up from its paper card, and a
     * rollout must never see a face the seat cannot ({@code faceDown}) -- a copied spell, which has no zone to rebuild
     * it from ({@code copied}), a spliced spell ({@code splice}), and (the skeptic's read) an item with a card target
     * that has changed zones since it was targeted ({@code stale}, {@link #staleTarget}).
     */
    public static String stackRefusal(final Game g) {
        final forge.game.zone.MagicStack st = g.getStack();
        if (st.hasSimultaneousStackEntries()) {
            return "waiting";
        }
        if (st.isFrozen()) {
            return "frozen";
        }
        if (st.isResolving()) {
            return "resolving";
        }
        if (st.isSplitSecondOnStack()) {
            return "splitSecond";
        }
        for (final forge.game.spellability.SpellAbilityStackInstance si : st) {
            final SpellAbility sa = si.getSpellAbility();
            final Card src = si.getSourceCard();
            if (sa == null || src == null || si.getActivatingPlayer() == null) {
                return "unmappable";
            }
            if (src.isFaceDown() || sa.isCastFaceDown()) {
                return "faceDown";
            }
            if (si.isSpell() && (src.isCopiedSpell() || sa.isCopied())) {
                return "copied";
            }
            if (sa.getSplicedCards() != null && !sa.getSplicedCards().isEmpty()) {
                return "splice";
            }
            if (staleTarget(g, sa)) {
                return "stale";
            }
        }
        return null;
    }

    /**
     * D544 (the skeptic's read): a card target of {@code sa}'s chain that has left its zone since it was targeted -- a
     * creature flickered in response, so the card is a new object with a new timestamp.  Forge's own fizzle test
     * ({@code MagicStack.hasFizzled}) reads such a target as illegal: {@code game.getCardState(t)} found in the game
     * and not {@code equalsWithGameTimestamp(t)}.  The copier's map is keyed by {@code GameEntity.equals}, the id
     * alone, so it would hand the copy the card's new object and the copy's item would resolve where the live one
     * fizzles; the window is refused instead.  Only targets: a paid card and a trigger's triggering objects are
     * last-known objects by design.  A card no longer in the game ({@code getCardState} hands back the target itself)
     * is the copier's to map or refuse ({@code unmappable}).
     */
    static boolean staleTarget(final Game g, final SpellAbility sa) {
        final SpellAbility root = sa instanceof forge.game.trigger.WrappedAbility
                ? ((forge.game.trigger.WrappedAbility) sa).getWrappedAbility() : sa;
        for (SpellAbility s = root; s != null; s = s.getSubAbility()) {
            if (!s.usesTargeting()) {
                continue;
            }
            for (final GameObject t : s.getTargets()) {
                if (t instanceof Card) {
                    final Card cur = g.getCardState((Card) t);
                    if (cur == null || !cur.equalsWithGameTimestamp((Card) t)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * D544: the stack as a key -- each item's source id, controller id and kind, top first -- for the opponent's
     * conditional pass ({@code RolloutController.Forced}) and the retry guard.
     */
    public static String stackKey(final Game g) {
        final StringBuilder sb = new StringBuilder();
        for (final forge.game.spellability.SpellAbilityStackInstance si : g.getStack()) {
            sb.append(si.isSpell() ? 's' : si.isTrigger() ? 't' : 'a')
                    .append(si.getSourceCard() == null ? -1 : si.getSourceCard().getId()).append('/')
                    .append(si.getActivatingPlayer() == null ? -1 : si.getActivatingPlayer().getId()).append(';');
        }
        return sb.toString();
    }

    /**
     * D544: rebuild the live stack on {@code copy}, bottom first, each item as {@link #rebuildItem} makes it, pushed by
     * {@code MagicStack.add} with {@link #HELD}'s triggers suppressed (it is the only public way onto the stack; the
     * cast happened in the live game, so its triggers must not fire again), and mapped in {@link #stackMap}; then
     * {@link #verifyStack}.  Anything that cannot be rebuilt faithfully throws {@link StackRefused}: the window is
     * refused, never guessed.  {@code seat} is the searching seat (the copier's {@code aiPlayer}): a triggering object
     * it may not see refuses the window ({@code hidden}).  The skeptic's read: the push's per-turn records that
     * {@code GameCopier} had already copied are put back as the copier made them -- each player's crimes this turn
     * ({@code setCommitedCrimeThisTurn}) and, for an activated ability, its source's activations this turn and this
     * game and the stack's list of abilities activated this turn ({@link #ActivationRecord}).
     */
    private void carryStackItems(final Game copy, final Player seat) {
        stackMap.clear();
        stackById = null;
        stackLki.clear();
        this.seat = seat;
        final String pre = stackRefusal(orig);
        if (pre != null) {
            throw new StackRefused(pre, "the live stack");
        }
        final Map<Player, Integer> crimes = new IdentityHashMap<>();
        for (final Player p : copy.getPlayers()) {
            crimes.put(p, p.getCommittedCrimeThisTurn());
        }
        final List<forge.game.spellability.SpellAbilityStackInstance> items = new ArrayList<>();
        for (final forge.game.spellability.SpellAbilityStackInstance si : orig.getStack()) {
            items.add(0, si);   // the stack iterates top first; the carry pushes bottom first
        }
        final TriggerHandler th = copy.getTriggerHandler();
        final List<TriggerType> held = new ArrayList<>();
        for (final TriggerType t : HELD) {
            if (!th.isTriggerSuppressed(t)) {
                th.suppressMode(t);
                held.add(t);
            }
        }
        try {
            for (final forge.game.spellability.SpellAbilityStackInstance si : items) {
                final SpellAbility n = rebuildItem(copy, si);
                final int before = copy.getStack().size();
                final ActivationRecord rec = new ActivationRecord(copy, n.getHostCard(), orig, si.getSourceCard());
                copy.getStack().add(n);
                rec.restore();   // MagicStack.add counts an activated ability once more: the copier copied the count
                if (copy.getStack().size() != before + 1) {
                    // MagicStack.add returns without a push when the item has no legal target ("failed to target")
                    throw new StackRefused("push", "card " + si.getSourceCard().getId());
                }
                stackMap.put(si.getSpellAbility(), copy.getStack().peekAbility());
            }
        } catch (final StackRefused e) {
            stackMap.clear();
            throw e;
        } catch (final RuntimeException e) {
            stackMap.clear();
            throw new StackRefused("unmappable", e.getClass().getSimpleName());
        } finally {
            for (final TriggerType t : held) {
                th.clearSuppression(t);
            }
            for (final Map.Entry<Player, Integer> e : crimes.entrySet()) {
                // MagicStack.add commits a crime again for an item that targets an opponent or what it has (CommitCrime
                // is held above, so no trigger ran); the copier had copied the count
                e.getKey().setCommitedCrimeThisTurn(e.getValue());
            }
        }
        verifyStack(copy);
    }

    /**
     * D544 (the skeptic's read): an activated ability's records that {@code MagicStack.add} writes on a push
     * ({@code addAbilityActivatedThisTurn}: the source's activations this turn and this game, and the stack's list of
     * abilities activated this turn), taken before the push and put back after it, through the tables' and the list's
     * own public methods, wherever the push took a record above the live game's.  Measured on the pinned engine
     * (ai-bench case (r)): {@code GameCopier} does not copy the activation of an item still on the stack (live 1, the
     * copy 0), so there the push's count is the live one and is kept; where the copier has copied it, the push would
     * count it twice and the record is put back.  A planeswalker's loyalty-activation count has no public setter and is
     * not compared (D544's *What is unverified*).
     */
    private static final class ActivationRecord {
        private final Card host;
        private final List<Object[]> turn;
        private final List<Object[]> game;
        private final List<SpellAbility> stackList;
        private final int stackSize;
        private final int liveTurn;
        private final int liveGame;
        private final int liveList;

        ActivationRecord(final Game copy, final Card host, final Game live, final Card liveHost) {
            this.host = host;
            this.turn = host == null ? null : cells(host.getAbilityActivatedThisTurn());
            this.game = host == null ? null : cells(host.getAbilityActivatedThisGame());
            this.stackList = copy.getStack().getAbilityActivatedThisTurn();
            this.stackSize = stackList == null ? 0 : stackList.size();
            this.liveTurn = liveHost == null ? 0 : total(liveHost.getAbilityActivatedThisTurn());
            this.liveGame = liveHost == null ? 0 : total(liveHost.getAbilityActivatedThisGame());
            final List<SpellAbility> l = live.getStack().getAbilityActivatedThisTurn();
            this.liveList = l == null ? 0 : l.size();
        }

        private static int total(final forge.game.card.ActivationTable t) {
            int n = 0;
            for (final com.google.common.collect.Multiset<Player> m : t.values()) {
                n += m == null ? 0 : m.size();
            }
            return n;
        }

        private static List<Object[]> cells(final forge.game.card.ActivationTable t) {
            final List<Object[]> out = new ArrayList<>();
            for (final com.google.common.collect.Table.Cell<SpellAbility, java.util.Optional<forge.game.staticability.StaticAbility>,
                    com.google.common.collect.Multiset<Player>> c : t.cellSet()) {
                out.add(new Object[] {c.getRowKey(), c.getColumnKey(),
                        c.getValue() == null ? null : com.google.common.collect.HashMultiset.create(c.getValue())});
            }
            return out;
        }

        @SuppressWarnings("unchecked")
        private static void put(final forge.game.card.ActivationTable t, final List<Object[]> cells) {
            t.clear();
            for (final Object[] c : cells) {
                if (c[2] != null) {
                    t.put((SpellAbility) c[0], (java.util.Optional<forge.game.staticability.StaticAbility>) c[1],
                            com.google.common.collect.HashMultiset.create((com.google.common.collect.Multiset<Player>) c[2]));
                }
            }
        }

        void restore() {
            if (host != null && total(host.getAbilityActivatedThisTurn()) > liveTurn) {
                put(host.getAbilityActivatedThisTurn(), turn);
            }
            if (host != null && total(host.getAbilityActivatedThisGame()) > liveGame) {
                put(host.getAbilityActivatedThisGame(), game);
            }
            final int keep = Math.max(stackSize, liveList);
            while (stackList != null && stackList.size() > keep) {
                stackList.remove(stackList.size() - 1);
            }
        }
    }

    /** D544: one live stack item rebuilt on {@code copy}, not yet pushed. */
    private SpellAbility rebuildItem(final Game copy, final forge.game.spellability.SpellAbilityStackInstance si) {
        final SpellAbility sa = si.getSpellAbility();
        final Card src = si.getSourceCard();
        final Player act = playerOnCopy(si.getActivatingPlayer());
        final Card host = cardOnCopy(copy, src);
        if (act == null || host == null) {
            throw new StackRefused("unmappable", "the source or controller of card " + src.getId());
        }
        if (readsManaSpent(src, sa)) {
            throw new StackRefused("manaSpent", "card " + src.getId());
        }
        for (final forge.game.mana.Mana m : sa.getPayingMana()) {
            if (m.addsNoCounterMagic(sa) || m.addsCounters(sa) || m.addsKeywords(sa) || m.triggersWhenSpent()) {
                throw new StackRefused("manaEffects", "card " + src.getId());
            }
        }
        final SpellAbility n;
        if (si.isTrigger()) {
            n = rebuildTrigger(copy, sa, src, host, act);
        } else {
            if (sa.isTrigger() || sa.isWrapper()) {
                throw new StackRefused("unmappable", "an item of unknown kind from card " + src.getId());
            }
            try {
                n = SearchPolicy.mapSaOn(this, sa, act, host);
            } catch (final RuntimeException e) {
                throw new StackRefused("unmappable", "card " + src.getId() + ": " + e.getClass().getSimpleName());
            }
            if (sa.getChosenList() != null) {
                // a modal item: Forge's cast appends a clone of each chosen mode to the spell (CharmEffect.chainAbilities)
                // and aims the clones, so the copy gets the same chain and the live chain's targets, part by part
                forge.game.ability.effects.CharmEffect.chainAbilities(n, new ArrayList<>(n.getChosenList()));
                copyTargetsOnto(sa, n, src);
            }
            if (n.getMayPlay() != null && n.getMayPlay().hasParam("ReplaceGraveyard")) {
                // MagicStack.add would make the may-play's replacement effect again beside the copied one
                throw new StackRefused("mayPlay", "card " + src.getId());
            }
        }
        carryPaid(copy, sa, n);
        if (si.isSpell()) {
            final forge.game.zone.Zone from = src.getCastFrom();
            if (from != null) {
                final forge.game.zone.Zone m = zoneOnCopy(copy, from);
                if (m == null) {
                    throw new StackRefused("castFrom", "card " + src.getId());
                }
                host.setCastFrom(m);
            }
            if (src.getCastSA() != null) {
                host.setCastSA(n);   // what "if it was kicked" and the like read once it resolves
            }
        }
        return n;
    }

    /** D544: the copy's card for a live card: the copy of the same object, else the copy's card with its id. */
    private Card cardOnCopy(final Game copy, final Card c) {
        final Card byId = copy.findById(c.getId());   // the copier keeps ids; a last-known object has its card's
        if (byId != null) {
            return byId;
        }
        try {
            final GameObject m = find(c);
            if (m instanceof Card) {
                return (Card) m;
            }
        } catch (final RuntimeException e) {
            // a last-known card the copy holds no card of: below
        }
        // a card that has ceased to exist (a token sacrificed to pay for the item, the Map or Clue the ability came
        // from): rebuilt on the copy, in no zone, as D500 rebuilds a damage source (its script and copiable
        // characteristics, its controller, its timestamps); null when it cannot be
        if (stackById == null) {
            stackById = new HashMap<>();
            for (final Card x : copy.getCardsInGame()) {
                stackById.put(x.getId(), x);
            }
        }
        return lkiOnCopy(copy, c, stackById, stackLki);
    }

    /** D544: the source's SVars and every part's parameters name a value read from the mana spent ({@link #MANA_SPENT}). */
    private static boolean readsManaSpent(final Card src, final SpellAbility sa) {
        for (final String v : src.getSVars().values()) {
            if (v != null && MANA_SPENT.matcher(v).find()) {
                return true;
            }
        }
        final SpellAbility root = sa instanceof forge.game.trigger.WrappedAbility
                ? ((forge.game.trigger.WrappedAbility) sa).getWrappedAbility() : sa;
        for (SpellAbility s = root; s != null; s = s.getSubAbility()) {
            for (final String v : s.getMapParams().values()) {
                if (v != null && MANA_SPENT.matcher(v).find()) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * D544: a triggered ability rebuilt as Forge's {@code TriggerHandler} builds one: the copy's trigger (the same
     * mode and description on the copy's source, and the same place among its triggers when that is ambiguous), its
     * ability copied for the controller, the triggering objects mapped, X and the optional flag carried, the targets
     * mapped, wrapped with the decider mapped.  A trigger the source does not carry itself (a delayed trigger, one a
     * spell spawned, one with remembered objects) and a modal one are refused.
     */
    private SpellAbility rebuildTrigger(final Game copy, final SpellAbility sa, final Card src, final Card host, final Player act) {
        if (!(sa instanceof forge.game.trigger.WrappedAbility)) {
            throw new StackRefused("trigger", "card " + src.getId());
        }
        final forge.game.trigger.WrappedAbility w = (forge.game.trigger.WrappedAbility) sa;
        final Trigger t = w.getTrigger();
        final SpellAbility innerLive = w.getWrappedAbility();
        if (t == null || innerLive == null || t.getSpawningAbility() != null || !t.getTriggerRemembered().isEmpty()) {
            throw new StackRefused("trigger", "card " + src.getId());
        }
        if (innerLive.getChosenList() != null) {
            throw new StackRefused("modes", "card " + src.getId());
        }
        final Trigger tc = matchTrigger(src, host, t);
        if (tc == null) {
            throw new StackRefused("trigger", "card " + src.getId() + ": mode " + t.getMode());
        }
        final SpellAbility inner = tc.ensureAbility().copy(host, act, false);
        inner.setTrigger(tc);
        inner.setTriggeringObjects(mapTriggeringObjects(copy, innerLive.getTriggeringObjects(), src));
        inner.setXManaCostPaid(innerLive.getXManaCostPaid());
        if (innerLive.isOptionalTrigger()) {
            inner.setOptionalTrigger(true);
        }
        copyTargetsOnto(innerLive, inner, src);
        final Player decider = w.getDecider() == null ? null : playerOnCopy(w.getDecider());
        if (w.getDecider() != null && decider == null) {
            throw new StackRefused("trigger", "card " + src.getId() + ": its decider");
        }
        final forge.game.trigger.WrappedAbility n = new forge.game.trigger.WrappedAbility(tc, inner, decider);
        n.setActivatingPlayer(act);
        return n;
    }

    /** D544: the copy's trigger for {@code t}: one of {@code host}'s with its mode and description; by place when several. */
    private static Trigger matchTrigger(final Card src, final Card host, final Trigger t) {
        final List<Trigger> copyTs = new ArrayList<>(host.getTriggers());
        final List<Trigger> same = new ArrayList<>();
        for (final Trigger x : copyTs) {
            if (x.getMode() == t.getMode() && String.valueOf(x).equals(String.valueOf(t))) {
                same.add(x);
            }
        }
        if (same.size() == 1) {
            return same.get(0);
        }
        if (same.size() > 1) {
            final int at = new ArrayList<>(src.getTriggers()).indexOf(t);
            if (at >= 0 && at < copyTs.size() && same.contains(copyTs.get(at))) {
                return copyTs.get(at);
            }
        }
        return null;
    }

    /** D544: a trigger's triggering objects on the copy; a value the copy cannot hold faithfully refuses the window. */
    private Map<forge.game.ability.AbilityKey, Object> mapTriggeringObjects(final Game copy,
            final Map<forge.game.ability.AbilityKey, Object> live, final Card src) {
        final Map<forge.game.ability.AbilityKey, Object> out = new HashMap<>();
        for (final Map.Entry<forge.game.ability.AbilityKey, Object> e : live.entrySet()) {
            final Object v = e.getValue();
            if (v == null) {
                continue;
            }
            if (v instanceof Card) {
                hiddenFromSeat((Card) v, e.getKey(), src);
                out.put(e.getKey(), sameCardOnCopy(copy, (Card) v, "triggering", src));
            } else if (v instanceof Player) {
                final Player p = playerOnCopy((Player) v);
                if (p == null) {
                    throw new StackRefused("triggering", "card " + src.getId() + ": " + e.getKey());
                }
                out.put(e.getKey(), p);
            } else if (v instanceof SpellAbility) {
                final SpellAbility m = stackMap.get(v);
                if (m == null) {
                    throw new StackRefused("triggering", "card " + src.getId() + ": " + e.getKey() + " is not on the stack");
                }
                out.put(e.getKey(), m);
            } else if (v instanceof CardCollection) {
                final CardCollection cc = new CardCollection();
                for (final Card c : (CardCollection) v) {
                    hiddenFromSeat(c, e.getKey(), src);
                    cc.add(sameCardOnCopy(copy, c, "triggering", src));
                }
                out.put(e.getKey(), cc);
            } else if (v instanceof forge.util.collect.FCollection || v instanceof java.util.ArrayList) {
                // the attack trigger's Defenders (players, planeswalkers, battles), a cast trigger's CurrentCastSpells
                // (the cards cast this turn): each element mapped as a single value is, in a collection of the same kind
                final java.util.Collection<Object> cc = v instanceof forge.util.collect.FCollection
                        ? new forge.util.collect.FCollection<>() : new ArrayList<>();
                for (final Object x : (Iterable<?>) v) {
                    cc.add(mapTriggeringElement(copy, x, e.getKey(), src));
                }
                out.put(e.getKey(), cc);
            } else if (v instanceof Number || v instanceof String || v instanceof Boolean || v instanceof Enum) {
                out.put(e.getKey(), v);
            } else {
                throw new StackRefused("triggering", "card " + src.getId() + ": " + e.getKey() + " holds " + v.getClass().getSimpleName());
            }
        }
        return out;
    }

    /**
     * D544 (the skeptic's read): a triggering object that is a card the searching seat may not see refuses the window
     * ({@code hidden}) -- a draw trigger's drawn card in the opponent's hand, say: carried, the copy's trigger would
     * name the card the determinizer redeals.  The rule is {@link Determinizer}'s, read on the card where it is now in
     * the live game: a card in a library, or in another player's hand, that {@code mayPlayerLook(seat)} does not let
     * the seat look at.  With no seat given, every card in a library or a hand counts as hidden.
     */
    private void hiddenFromSeat(final Card c, final forge.game.ability.AbilityKey key, final Card src) {
        final Card cur = orig.getCardState(c);
        final Card x = cur == null ? c : cur;
        final Zone z = x.getZone();
        if (z == null) {
            return;
        }
        final ZoneType t = z.getZoneType();
        final boolean hiddenZone = t == ZoneType.Library || t == ZoneType.Hand && (seat == null || x.getOwner() != seat);
        if (hiddenZone && (seat == null || !x.mayPlayerLook(seat))) {
            throw new StackRefused("hidden", "card " + src.getId() + ": " + key + " is a card in a hidden zone");
        }
    }

    /** D544: one element of a collection-valued triggering object, mapped as a single value would be (or refused). */
    private Object mapTriggeringElement(final Game copy, final Object x, final forge.game.ability.AbilityKey key, final Card src) {
        if (x instanceof Card) {
            hiddenFromSeat((Card) x, key, src);
            return sameCardOnCopy(copy, (Card) x, "triggering", src);
        }
        if (x instanceof Player) {
            final Player p = playerOnCopy((Player) x);
            if (p != null) {
                return p;
            }
        } else if (x instanceof SpellAbility) {
            final SpellAbility m = stackMap.get(x);
            if (m != null) {
                return m;
            }
        }
        throw new StackRefused("triggering", "card " + src.getId() + ": " + key + " holds "
                + (x == null ? "null" : x.getClass().getSimpleName()));
    }

    /**
     * D544: the copy's card standing for {@code c}, a live card or a last-known one: the copy's card with its id when
     * its name, power, toughness and mana value read the same as {@code c}'s, else a last-known copy of it that does;
     * otherwise the value is not the copy's to give, and the window is refused ({@code why}).
     */
    private Card sameCardOnCopy(final Game copy, final Card c, final String why, final Card src) {
        final Card m = cardOnCopy(copy, c);
        if (m == null) {
            throw new StackRefused(why, "card " + src.getId() + ": card " + c.getId() + " is not on the copy");
        }
        if (readsSame(c, m)) {
            return m;
        }
        throw new StackRefused(why, "card " + src.getId() + ": card " + c.getId() + " reads differently on the copy");
    }

    private static boolean readsSame(final Card a, final Card b) {
        return a.getName().equals(b.getName()) && a.getNetPower() == b.getNetPower() && a.getNetToughness() == b.getNetToughness()
                && a.getCMC() == b.getCMC() && a.getId() == b.getId();
    }

    /** D544: each targeting part's targets, found on the copy (a stack item through {@link #stackMap}). */
    private void copyTargetsOnto(final SpellAbility from, final SpellAbility to, final Card src) {
        SpellAbility a = from;
        SpellAbility b = to;
        while (a != null && b != null) {
            if (a.usesTargeting()) {
                b.resetTargets();
                for (final GameObject t : a.getTargets()) {
                    final GameObject m;
                    try {
                        m = find(t);
                    } catch (final RuntimeException e) {
                        throw new StackRefused("unmappable", "card " + src.getId() + ": a target");
                    }
                    b.getTargets().add(m);
                    if (a.isDividedAsYouChoose()) {
                        b.addDividedAllocation(m, a.getDividedValue(t));
                    }
                }
            }
            a = a.getSubAbility();
            b = b.getSubAbility();
        }
        if (a != null || b != null) {
            throw new StackRefused("unmappable", "card " + src.getId() + ": its parts differ on the copy");
        }
    }

    /**
     * D544: the cards paid for the item (sacrificed, exiled, discarded, tapped: {@code getPaidHash}), each the copy's
     * card that reads as the paid one did ({@link #sameCardOnCopy}); a paid card the copy cannot stand for refuses
     * the window ({@code paid}).
     */
    private void carryPaid(final Game copy, final SpellAbility live, final SpellAbility n) {
        final SpellAbility from = live instanceof forge.game.trigger.WrappedAbility
                ? ((forge.game.trigger.WrappedAbility) live).getWrappedAbility() : live;
        final SpellAbility to = n instanceof forge.game.trigger.WrappedAbility
                ? ((forge.game.trigger.WrappedAbility) n).getWrappedAbility() : n;
        final com.google.common.collect.TreeBasedTable<String, Boolean, CardCollection> paid = from.getPaidHash();
        if (paid == null || paid.isEmpty()) {
            return;
        }
        final com.google.common.collect.TreeBasedTable<String, Boolean, CardCollection> out =
                com.google.common.collect.TreeBasedTable.create();
        for (final com.google.common.collect.Table.Cell<String, Boolean, CardCollection> cell : paid.cellSet()) {
            final CardCollection cc = new CardCollection();
            for (final Card c : cell.getValue()) {
                cc.add(sameCardOnCopy(copy, c, "paid", from.getHostCard()));
            }
            out.put(cell.getRowKey(), cell.getColumnKey(), cc);
        }
        to.setPaidHash(out);
    }

    /**
     * D544: the carried stack against the live one, item by item (top first): the source card's id, the controller's
     * id, the kind, every target's id (a stack item's by its source's), X, and the paid cards' count.  Any mismatch
     * refuses the window ({@code verify}).
     */
    private void verifyStack(final Game copy) {
        final List<String> a = stackShape(orig.getStack());
        final List<String> b = stackShape(copy.getStack());
        if (!a.equals(b)) {
            stackMap.clear();
            throw new StackRefused("verify", "live " + shapeDetail(a) + " copy " + shapeDetail(b));
        }
    }

    /** D544: a stack's shape as a refusal's detail: ids and words only ({@link #DETAIL_CHARS}). */
    private static String shapeDetail(final List<String> shape) {
        return shape.isEmpty() ? "empty" : String.join(", ", shape).replace(" ->", " at").replace("?", "u");
    }

    /** D544: {@link #verifyStack}'s view of a stack (ids only, top first). */
    static List<String> stackShape(final forge.game.zone.MagicStack st) {
        final List<String> out = new ArrayList<>();
        for (final forge.game.spellability.SpellAbilityStackInstance si : st) {
            final StringBuilder sb = new StringBuilder();
            sb.append(si.isSpell() ? 's' : si.isTrigger() ? 't' : 'a')
                    .append(si.getSourceCard() == null ? -1 : si.getSourceCard().getId()).append(" by ")
                    .append(si.getActivatingPlayer() == null ? -1 : si.getActivatingPlayer().getId());
            final SpellAbility sa = si.getSpellAbility();
            final SpellAbility root = sa instanceof forge.game.trigger.WrappedAbility
                    ? ((forge.game.trigger.WrappedAbility) sa).getWrappedAbility() : sa;
            sb.append(" ->");
            for (SpellAbility s = root; s != null; s = s.getSubAbility()) {
                if (!s.usesTargeting()) {
                    continue;
                }
                for (final GameObject t : s.getTargets()) {
                    sb.append(' ').append(t instanceof Card ? "c" + ((Card) t).getId() : t instanceof Player ? "p" + ((Player) t).getId()
                            : t instanceof SpellAbility && ((SpellAbility) t).getHostCard() != null
                            ? "s" + ((SpellAbility) t).getHostCard().getId() : "?");
                }
            }
            sb.append(" x").append(root.getXManaCostPaid());
            int paid = 0;
            if (root.getPaidHash() != null) {
                for (final CardCollection cc : root.getPaidHash().values()) {
                    paid += cc.size();
                }
            }
            sb.append(" paid").append(paid);
            out.add(sb.toString());
        }
        return out;
    }
}
