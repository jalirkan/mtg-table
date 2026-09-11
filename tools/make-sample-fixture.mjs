// mtg-table — tools/make-sample-fixture.mjs
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Regenerates fixtures/synthetic/sample-handwritten.jsonl: a hand-written
// s2c excerpt (plus the c2s lines that answer it) following docs/protocol.md
// exactly, committed so web/ has something to replay before
// mtgtable.RecordMatch has ever run. Card names, mana costs, type lines and P/T
// are the real MSH/MSC printings, read out of Forge's own card scripts.
//
// It lives under fixtures/synthetic/, NOT fixtures/games/, and that placement is
// load-bearing. This file and web/src/protocol.ts were written by the same hand
// from the same reading of docs/protocol.md, so it is structurally incapable of
// detecting Java-to-TypeScript drift; counting it as a contract fixture inflates
// the number of recordings that can actually fail. What it IS good for is the
// shapes an AI-vs-AI game never produces, and after the 2026-09-11 amendments
// that list is long:
//
//   * `input` — including the two halves an engine recording has no seat for:
//     a `focusCard` that is NOT in the snapshot (§4, amendment P7) and a
//     non-empty `openZones` hint (§4.3, amendment P6).
//   * `ask` — **all eleven kinds** (§5.2), each with its `answer`, so the option
//     shape of §5.1, `order`'s `{ordered, remember}` (never null), `choose_list`
//     with `reveal: true`, and `choose_entities.delayedReveal` are exercised by
//     an artifact rather than only by prose.
//   * a face-down card in three places at once: an opponent's morph (no `alt`),
//     the viewer's own manifest (`alt` present — the seat may flip it) and a
//     foretold card in the viewer's own exile, where `canFaceDownBeShownTo` is
//     false because it ends `isInZone(Battlefield, Stack, Sideboard)`, so the
//     card has NO public body: `types: ""` and null P/T (§3.2).
//   * `library.cards` with content, the `surveil` / `phased` / `foretold` event
//     kinds, and a `zone` event with a null `from` and one with a null `to`.
//   * a **token** (amendment P15, `CardView.isToken()`): the card the null-`from`
//     zone event is about, so the event and the card it created are in the same
//     frame and a renderer can be checked against both.
//   * **all ten frame types of section 2**, which no other artifact in the repo
//     has: an AI-vs-AI recording carries `hello_ok`, `state` and `over` and
//     nothing else, so `notice` (section 6), `ping`/`pong` (section 2.5) and
//     `resync` (section 2.4) reached the reducer only through hand-built unit
//     tests until this file carried one of each.
//
// TWO THINGS THIS FILE IS NOT EVIDENCE FOR. It is hand-built, so a shape here
// proves the *renderer* is total over it and nothing about what Snap.java
// emits. Where an engine recording does cover a shape, that recording is the
// evidence: `fixtures/games/future-sight.jsonl` for a non-empty `library.cards`
// (decks/future-sight-probe.dck runs the continuous MayLookAt static that no
// card in decks/pacho-shield.dck has), `fixtures/games/morph.jsonl` for
// face-down cards, `fixtures/games/disjoint.jsonl` for two-deck redaction.
//
//     node tools/make-sample-fixture.mjs fixtures/synthetic/sample-handwritten.jsonl
import { writeFileSync } from 'node:fs';

const JAR_SHA = '3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9';
const DECK_SHA = '477275b16285f7a5e5a98a51a1dfbe0e515ec4276e204092820823ab551df2f2';
const T0 = Date.UTC(2026, 8, 11, 20, 14, 3);

const pool = () => ({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 });

/**
 * §3.2 — the full card, all 23 keys, every one of them always present. `token`
 * (amendment P15) and `alt` (amendment P3) are not optional: a renderer that has
 * to test for key absence is carrying a second source of truth, which is exactly
 * what CLAUDE.md rule 10 bans on the Java side.
 */
function card(o) {
  return {
    id: o.id,
    name: o.name,
    setCode: o.setCode ?? 'MSH',
    manaCost: o.manaCost ?? null,
    types: o.types,
    power: o.power ?? null,
    toughness: o.toughness ?? null,
    loyalty: null,
    damage: o.damage ?? 0,
    counters: o.counters ?? {},
    tapped: o.tapped ?? false,
    sick: o.sick ?? false,
    attacking: o.attacking ?? false,
    blocking: o.blocking ?? false,
    faceDown: o.faceDown ?? false,
    token: o.token ?? false,
    alt: o.alt ?? null,
    attachedToId: o.attachedToId ?? null,
    attachmentIds: o.attachmentIds ?? [],
    controller: o.controller,
    owner: o.owner ?? o.controller,
    zone: o.zone,
    abilities: o.abilities ?? [],
  };
}

/**
 * §3.3 gate 1, amendment P1 — the ONE concealed shape, and it is exactly five
 * keys. `owner` is the fifth because `canBeShownTo`'s `case Hand` compares
 * CONTROLLERS while the zone arrays are keyed by the zone's player.
 */
const hidden = (id, controller, zone = 'hand', owner = controller) =>
  ({ id, zone, owner, controller, hidden: true });

const zone = (cards) => ({ count: cards.length, cards });
/** §3.4, amendment P2 — a library is `{count, cards}`; `cards` is the revealed slice. */
const library = (count, cards = []) => ({ count, cards });

// --- the cards in play (real MSH/MSC printings, from Forge's card scripts) ---
const PLAINS = (id, c, tapped) =>
  card({ id, name: 'Plains', manaCost: null, types: 'Basic Land - Plains', zone: 'battlefield', controller: c, tapped,
         abilities: [{ id: id * 10 + 1, text: '{T}: Add {W}.', canPlay: !tapped, isSpell: false }] });
const ISLAND = (id, c, tapped) =>
  card({ id, name: 'Island', manaCost: null, types: 'Basic Land - Island', zone: 'battlefield', controller: c, tapped,
         abilities: [{ id: id * 10 + 1, text: '{T}: Add {U}.', canPlay: !tapped, isSpell: false }] });

const coulson = (o) => card({ id: 112, name: 'Agent Phil Coulson', manaCost: '{1}{W}',
  types: 'Legendary Creature - Human Spy Hero', power: '2', toughness: '2', controller: 0,
  zone: 'battlefield', attachmentIds: [116], ...o });
const agents = (o) => card({ id: 114, name: 'Agents of S.H.I.E.L.D.', manaCost: '{2}{W}',
  types: 'Creature - Human Spy Hero', power: '2', toughness: '4', controller: 0, zone: 'battlefield', ...o });
const quake = (o) => card({ id: 115, name: 'Quake, Agent of S.H.I.E.L.D.', manaCost: '{2}{W}',
  types: 'Legendary Creature - Inhuman Spy Hero', power: '3', toughness: '3', controller: 0,
  zone: 'battlefield', ...o });
const spyKit = (o) => card({ id: 116, name: 'S.H.I.E.L.D. Spy Kit', manaCost: '{W}',
  types: 'Artifact - Equipment', controller: 0, zone: 'battlefield', attachedToId: 112,
  abilities: [{ id: 1161, text: 'Equip {1}', canPlay: true, isSpell: false }], ...o });
const doombot = (o) => card({ id: 211, name: 'Aerial Doombot', manaCost: '{U}',
  types: 'Artifact Creature - Robot Villain', power: '1', toughness: '1', controller: 1,
  zone: 'battlefield', ...o });

/**
 * §3.3 gate 2, amendment P3 — an opponent's face-down permanent. There is no
 * separate shape for it: it takes the ordinary full branch, because `name` is
 * already `""` and `setCode` already `"???"` in Forge's own face-down
 * characteristic (`CardUtil.getFaceDownCharacteristic`), and what the gate
 * withholds is `alt`. Before P3 this was an eleven-key `faceDownHidden` object;
 * nothing emits that any more and `tools/check-redaction.mjs` fails a file that
 * carries one.
 */
const oppFaceDown = (o = {}) => card({
  id: 213, name: '', setCode: '???', manaCost: null, types: 'Creature',
  power: '2', toughness: '2', controller: 1, zone: 'battlefield',
  sick: false, faceDown: true, alt: null, ...o,
});

/**
 * The other side of gate 2: a card the viewing seat manifested. `isFaceDown() &&
 * canFaceDownBeShownTo(viewer)` is true — the controller of a face-down
 * permanent may look at it — so `alt` carries the real face. Before this
 * amendment the viewer's own morph rendered as an unnamed 2/2.
 */
const myManifest = (o = {}) => card({
  id: 117, name: '', setCode: '???', manaCost: null, types: 'Creature',
  power: '2', toughness: '2', controller: 0, zone: 'battlefield',
  faceDown: true,
  alt: { name: 'Bold Biochemist', manaCost: '{1}{U}',
         types: 'Creature - Human Scientist', power: '1', toughness: '3' },
  ...o,
});

/**
 * A foretold card in the viewer's OWN exile. `canBeShownTo` is true — foretell
 * calls `addMayLookFaceDownExile`, and `CardView.canBeShownTo`'s `case Exile`
 * falls through to `mayPlayerLook(viewer)` — but `canFaceDownBeShownTo` ends
 * `isInZone(Battlefield, Stack, Sideboard)`, so there is no `alt` and no public
 * body at all: `types` is `""` and P/T are null (§3.2). This is the shape no
 * engine recording in the corpus produces, and the one a renderer is most likely
 * to draw as a 2/2 by accident.
 */
const myForetold = () => card({
  id: 118, name: '', setCode: '???', manaCost: null, types: '',
  power: null, toughness: null, controller: 0, zone: 'exile', faceDown: true, alt: null,
});

/**
 * §3.2, amendment P15 — `CardView.isToken()`. A token has a card id like any
 * other permanent, `manaCost: null` like a land, and **no printing behind it**:
 * `art.json` can never have an entry, and the renderer draws its generated
 * frame and says "token" rather than reporting an art miss.
 *
 * Shape copied from a real one in `fixtures/games/g1.jsonl` (`Soldier Token`,
 * MSH, 1/1, `abilities: []`) so the hand-built file cannot drift from what the
 * emitter actually writes. Its id is **90 on purpose**: that is the id of the
 * `zone` event below whose `from` is `null`, so the event that says "a token
 * came from nowhere" and the token it created are in the same frame.
 */
const soldierToken = (o = {}) => card({
  id: 90, name: 'Soldier Token', setCode: 'MSH', manaCost: null,
  types: 'Creature - Soldier', power: '1', toughness: '1',
  controller: 0, zone: 'battlefield', token: true, sick: true, ...o,
});

const handPlains = card({ id: 101, name: 'Plains', manaCost: null, types: 'Basic Land - Plains',
  zone: 'hand', controller: 0 });
const handQuantum = card({ id: 102, name: 'Quantum Reduction', setCode: 'MSC', manaCost: '{1}{U}',
  types: 'Enchantment - Aura', zone: 'hand', controller: 0,
  abilities: [{ id: 1021, text: 'Cast Quantum Reduction', canPlay: true, isSpell: true }] });
const handDoombot = card({ id: 104, name: 'Aerial Doombot', manaCost: '{U}',
  types: 'Artifact Creature - Robot Villain', power: '1', toughness: '1', zone: 'hand', controller: 0,
  abilities: [{ id: 1041, text: 'Cast Aerial Doombot', canPlay: true, isSpell: true }] });
const myGrave = card({ id: 105, name: 'Helicarrier Strike', manaCost: '{1}{W}',
  types: 'Instant', zone: 'graveyard', controller: 0 });
const oppGrave = card({ id: 212, name: 'Bold Biochemist', manaCost: '{1}{U}',
  types: 'Creature - Human Scientist', power: '1', toughness: '3', zone: 'graveyard', controller: 1 });

// Library cards. `topOfLibrary` is the §3.4 revealed slice; the other three are
// only ever seen inside an `ask` body, which is the point of `focusCard` and of
// `delayedReveal` — a library card is not in the snapshot.
const topOfLibrary = card({ id: 106, name: 'Nick Fury, Spymaster', manaCost: '{4}{W}',
  types: 'Legendary Creature - Human Spy Hero', power: '4', toughness: '4',
  zone: 'library', controller: 0 });
const libDepower = card({ id: 107, name: 'Depower', setCode: 'MSC', manaCost: '{2}{U}',
  types: 'Instant', zone: 'library', controller: 0 });
const libAim = card({ id: 108, name: 'A.I.M. Scientists', manaCost: '{3}{U}',
  types: 'Creature - Human Scientist Villain', power: '3', toughness: '3',
  zone: 'library', controller: 0 });
const libWebUp = card({ id: 109, name: 'Web Up', manaCost: '{2}{W}',
  types: 'Enchantment', zone: 'library', controller: 0 });

// --- frames ---------------------------------------------------------------

const header = {
  v: 1, kind: 'session', gameId: 'sample-handwritten',
  startedAt: '2026-09-11T20:14:03Z', seed: 42,
  forgeVersion: '2.0.14', forgeJarSha256: JAR_SHA, seat: 0,
  // section 8.1: which client played this seat. Absent from an AI-vs-AI
  // recording, which has no transport; this file stands in for the M3 browser
  // session, so it carries the key the engine recordings cannot.
  transport: 'ws',
  // section 8.1: one entry per seat, but `path`/`sha256` belong to the viewing
  // seat alone -- they identify a decklist exactly, and section 8.3 promises the
  // log holds only what this seat was allowed to see. `cards` is public.
  decks: [
    { player: 0, path: 'decks/pacho-shield.dck', sha256: DECK_SHA, cards: 40 },
    { player: 1, path: null, sha256: null, cards: 40 },
  ],
};

const f = (seq, dt, dir, type, body) => ({ v: 1, seq, t: T0 + dt, dir, type, body });

const helloOk = f(1, 0, 's2c', 'hello_ok', {
  gameId: 'sample-handwritten', you: 0, seed: 42,
  forgeVersion: '2.0.14', forgeJarSha256: JAR_SHA, unsupportedCards: [],
  players: [
    { id: 0, name: 'Pacho', isAi: false },
    { id: 1, name: 'Opponent', isAi: true },
  ],
});

const mainOne = f(2, 2400, 's2c', 'state', {
  gameId: 'sample-handwritten', turn: 9, round: 5, phase: 'MAIN1',
  activePlayer: 0, priority: 0, gameOver: null,
  players: [
    {
      id: 0, name: 'Pacho', isAi: false, life: 17, poison: 0, counters: {}, manaPool: pool(),
      zones: {
        hand: zone([handPlains, handQuantum, handDoombot]),
        battlefield: zone([
          PLAINS(110, 0, false), PLAINS(113, 0, false), ISLAND(111, 0, false),
          coulson({}), agents({}), quake({}), spyKit({}), myManifest(),
        ]),
        graveyard: zone([myGrave]),
        exile: zone([myForetold()]),
        command: zone([]),
        // §3.4 / amendment P2: `count` is the FULL size; `cards` is only what
        // canBeShownTo(viewer) allows -- here the top card, as a continuous
        // MayLookAt static (Future Sight, Oracle of Mul Daya) reveals it. No
        // card in decks/pacho-shield.dck runs one, which is why
        // fixtures/games/future-sight.jsonl exists: THAT file is the emitter's
        // evidence for this shape, and this one is the renderer's.
        library: library(28, [topOfLibrary]),
      },
    },
    {
      id: 1, name: 'Opponent', isAi: true, life: 2, poison: 0, counters: {}, manaPool: pool(),
      zones: {
        hand: zone([hidden(201, 1), hidden(202, 1)]),
        battlefield: zone([ISLAND(210, 1, true), doombot({}), oppFaceDown()]),
        graveyard: zone([oppGrave]),
        exile: zone([]),
        command: zone([]),
        library: library(31),
      },
    },
  ],
  stack: [],
  stackCards: [],
  combat: null,
  // One GameEventForwarder flush can span a turn boundary: this batch carries the
  // end of the opponent's turn 8 and the start of our turn 9. The last four are
  // amendment P4's kinds; `scry` is the only one any engine recording in the
  // corpus produces, so this is where the other three are pinned down.
  events: [
    { kind: 'damage', target: { kind: 'player', id: 0 }, sourceCardId: 211, amount: 1, combat: true, damageType: null },
    { kind: 'life', player: 0, from: 18, to: 17 },
    { kind: 'combat_end', attackerIds: [211], blockerIds: [] },
    { kind: 'phase', player: 1, phase: 'END_OF_TURN' },
    { kind: 'turn', player: 0, turn: 9 },
    { kind: 'phase', player: 0, phase: 'UPKEEP' },
    { kind: 'zone', cardId: 101, from: { zone: 'library', player: 0 }, to: { zone: 'hand', player: 0 } },
    { kind: 'phase', player: 0, phase: 'MAIN1' },
    { kind: 'scry', player: 0, toTop: 1, toBottom: 0 },
    { kind: 'surveil', player: 0, toLibrary: 1, toGraveyard: 1 },
    { kind: 'phased', cardId: 211, phasedOut: false },
    // GameEventCardForetold's only component is activatingPlayer() -- there is no
    // card accessor to build a {cardId} from, so the body is {player} (§3.6).
    { kind: 'foretold', player: 0 },
  ],
});

const mainOneInput = f(3, 2450, 's2c', 'input', {
  prompt: 'Play a land or cast a spell',
  focusCardId: null,
  focusCard: null,
  buttons: { ok: { label: 'OK', enabled: true }, cancel: { label: 'Cancel', enabled: false } },
  selectable: { cardIds: [101, 102, 104, 110, 111, 113, 116], min: 0, max: 1, mode: 'cards' },
  highlighted: [],
  weak: [],
  openZones: [],
});

const clickQuantum = f(1, 9100, 'c2s', 'act', { action: 'clickCard', cardId: 102 });

// --- the eleven ask kinds (§5.2), each with its answer ----------------------
//
// An AI-vs-AI recording contains none of these: nobody is playing. They are
// here so that M2's WireGuiGame has a committed artifact to match rather than
// only a table in a document, and so the reducer's "throw on an unknown kind"
// is exercised against every kind that is NOT unknown.

let seqS = 3;
let seqC = 1;
let clock = 9100;
const asks = [];
/** Emit an `ask` and the `answer` that closes it. Returns the ask's id. */
function ask(kind, body, value) {
  clock += 400;
  const askId = `a${asks.length + 1}`;
  asks.push(f(++seqS, clock, 's2c', 'ask', { askId, kind, timeoutMs: 120000, ...body }));
  clock += 900;
  asks.push(f(++seqC, clock, 'c2s', 'answer', { askId, value }));
  return askId;
}

/** §5.1 — an option is an ask-local index, a label, a kind, and maybe a card. */
const opt = (id, label, kind, extra = {}) => ({ id, label, kind, ...extra });
const cardOpt = (id, c, extra = {}) => opt(id, c.name, 'card', { cardId: c.id, card: c, ...extra });

// 1. confirm -- and `card` is not decoration: confirm(CardView, ...) is how
//    surveil's single-card case asks about a card that is in the LIBRARY, and
//    therefore not in `state` at all.
ask('confirm', {
  prompt: 'Put Depower on the bottom of your library?',
  title: 'Surveil 1',
  yesLabel: 'Bottom', noLabel: 'Top',
  defaultYes: false,
  card: libDepower,
}, true);

// 2. options -- showOptionDialog. `defaultIndex` is what a null answer means.
ask('options', {
  prompt: 'Choose a mode for Strategic Intervention',
  title: 'Modal spell',
  options: [
    opt(0, 'Draw a card', 'other'),
    opt(1, 'Tap up to one target creature', 'other'),
    opt(2, 'Give it +1/+1 until end of turn', 'other'),
  ],
  defaultIndex: 0,
  card: null,
}, 1);

// 3. text -- showInputDialog.
ask('text', {
  prompt: 'Name a card',
  title: 'Choose a card name',
  initial: '',
  suggestions: ['Aerial Doombot', 'Bold Biochemist', 'A.I.M. Scientists'],
  numeric: false,
}, 'Bold Biochemist');

// 4. ability_menu -- getAbilityToPlay. `canPlay` is the ENGINE's answer, and the
//    only basis for showing an ability as available (§3.2).
ask('ability_menu', {
  cardId: 116,
  options: [
    opt(0, 'Equip {1}', 'ability', { abilityId: 1161, canPlay: true, isSpell: false }),
    opt(1, 'Cast S.H.I.E.L.D. Spy Kit', 'ability', { abilityId: 1162, canPlay: false, isSpell: true }),
  ],
}, 0);

// 5. choose_list with reveal -- AbstractGuiGame.reveal is getChoices(msg,-1,-1,…):
//    a negative min means SHOW THESE, SELECT NOTHING. Without the flag a client
//    renders an impossible "pick -1 cards"; with it, one OK button and `[]`.
ask('choose_list', {
  prompt: 'Revealed from the top of your library',
  options: [cardOpt(0, topOfLibrary), cardOpt(1, libAim)],
  preselected: [],
  min: 0, max: 0,
  reveal: true,
}, []);

// 6. choose_list, an actual choice -- a discard, from the viewer's OWN hand.
ask('choose_list', {
  prompt: 'Choose a card to discard',
  options: [cardOpt(0, handPlains), cardOpt(1, handQuantum), cardOpt(2, handDoombot)],
  preselected: [],
  min: 1, max: 1,
  reveal: false,
}, [0]);

// 7. order -- OrderResult is (List ordered, boolean rememberDecision), NOT
//    top/bottom, and the answer is NEVER null: three call sites dereference
//    .ordered() unguarded. Indices address `dest ++ source`, in that order.
ask('order', {
  prompt: 'Order the triggers to put on the stack',
  destLabel: 'On the stack (first to resolve last)',
  dest: [cardOpt(0, quake({}))],
  source: [cardOpt(1, coulson({})), cardOpt(2, agents({}))],
  // Forge's remainingMin / remainingMax: how many may be LEFT in `source`.
  min: 0, max: 0,
  referenceCardId: 115,
  sideboardMode: false,
  showRemember: true,
}, { ordered: [0, 2, 1], remember: false });

// 8. choose_entities with a delayedReveal -- the single largest legitimate
//    reveal on the wire. `delayedReveal` is the CONTEXT ("here is what you are
//    looking at"); `options` is the CHOICE. They overlap only partially.
ask('choose_entities', {
  prompt: 'Search your library for a card',
  options: [cardOpt(0, libAim), cardOpt(1, libWebUp)],
  min: 1, max: 1,
  delayedReveal: {
    owner: 0,
    zones: ['library'],
    messagePrefix: 'Searching: ',
    cards: [topOfLibrary, libDepower, libAim, libWebUp],
  },
}, [1]);

// 9. assign_damage -- THE DEFENDER IS INDEX 0, carrying `defender: true` and a
//    playerId; the blockers follow with their remaining toughness as `lethal`.
//    A null answer is legal and means "let Forge assign".
ask('assign_damage', {
  attackerId: 112,
  total: 2,
  overrideOrder: false,
  maySkip: true,
  targets: [
    opt(0, 'Opponent', 'player', { playerId: 1, defender: true }),
    cardOpt(1, doombot({ blocking: true }), { lethal: 1 }),
  ],
}, { 0: 1, 1: 1 });

// 10. assign_amount -- the engine's map is Map<Object,Integer> and its keys may
//     be a GameEntityView OR a MagicColor.Color, so a target's kind is `entity`
//     or `color`. Answers stay indices either way.
ask('assign_amount', {
  sourceCardId: 115,
  total: 3,
  atLeastOne: false,
  label: 'damage',
  targets: [
    cardOpt(0, doombot({}), { kind: 'entity', max: 3 }),
    opt(1, 'Opponent', 'entity', { playerId: 1, max: 3 }),
    opt(2, 'White', 'color', { max: 3 }),
  ],
}, { 0: 1, 1: 2 });

// 11. manipulate_list -- surveil and the scry-likes. The answer is the FULL list
//     in its new order and is never null (PlayerControllerHuman indexes it).
//     With UI_SELECT_FROM_CARD_DISPLAYS off (decision D13) the whole-library
//     path never fires, so this is the top N and nothing more.
ask('manipulate_list', {
  prompt: 'Arrange the top 3 cards of your library',
  cards: [cardOpt(0, topOfLibrary), cardOpt(1, libDepower), cardOpt(2, libAim)],
  manipulable: [0, 1, 2],
  toTop: true, toBottom: true, toAnywhere: false,
}, [2, 0, 1]);

// 12. sideboard -- PaperCards, your own pool, no redaction question. Forge never
//     gives us the opponent's, and we would not emit it if it did.
ask('sideboard', {
  prompt: 'Sideboard for game 2',
  main: [opt(0, 'Aerial Doombot', 'card'), opt(1, 'Depower', 'card')],
  side: [opt(2, 'Web Up', 'card')],
}, [0, 2]);

// The EDT half, after the asks: a `focusCard` the snapshot does NOT contain
// (§4 — setCard/setPanelSelection are pushed with library cards), a non-empty
// `weak` (§4, setWeaklySelectable), a non-empty `openZones` hint (§4.3 — it is
// NOT a question; the deleted `open_zones` ask kind is why), and the §4.2
// invariant: a disabled OK means the engine wants a CARD CLICK.
const surveilInput = f(++seqS, clock + 400, 's2c', 'input', {
  prompt: 'Choose a card to put into your graveyard',
  focusCardId: 107,
  focusCard: libDepower,
  buttons: { ok: { label: 'OK', enabled: false }, cancel: { label: 'Undo (1)', enabled: true } },
  selectable: { cardIds: [106, 107], min: 1, max: 1, mode: 'cards' },
  highlighted: [112],
  weak: [110, 113],
  openZones: [{ playerId: 1, zones: ['graveyard', 'exile'] }],
});

// --- the four frame types no recording carries (§2) -------------------------
//
// An AI-vs-AI log is `hello_ok`, a run of `state`, and `over` (§8.4). These four
// are the rest of §2's table, and the reducer has a branch for each: without
// them, every one of those branches was covered only by a frame hand-built
// inside a unit test, which is a different artifact from the one the transport
// actually parses.

// §2.5 — keepalive, in both directions. It carries no game meaning and the
// reducer ignores it; what it must not do is throw or advance the board.
const pingOut = f(++seqS, clock + 100, 's2c', 'ping', {});
const pongBack = f(++seqC, clock + 120, 'c2s', 'pong', {});

// §2.4 — a client asking for a fresh snapshot after a reconnect. It is a
// request, not an effect: the `state` that answers it is the next frame, which
// is exactly the order a replay reads them in.
const resyncRequest = f(++seqC, clock + 5000, 'c2s', 'resync', {});

const declareBlockers = f(++seqS, clock + 6000, 's2c', 'state', {
  gameId: 'sample-handwritten', turn: 9, round: 5, phase: 'COMBAT_DECLARE_BLOCKERS',
  activePlayer: 0, priority: 0, gameOver: null,
  players: [
    {
      id: 0, name: 'Pacho', isAi: false, life: 17, poison: 0, counters: {}, manaPool: pool(),
      zones: {
        hand: zone([handPlains, handDoombot]),
        battlefield: zone([
          PLAINS(110, 0, true), PLAINS(113, 0, false), ISLAND(111, 0, true),
          coulson({ tapped: true, attacking: true }),
          agents({ tapped: true, attacking: true }),
          quake({ tapped: true }),
          spyKit({}),
          myManifest({ tapped: true, attacking: true }),
          // The token the null-`from` zone event in this frame's `events`
          // created (P15). Summoning sick, so it is not among the attackers.
          soldierToken(),
        ]),
        graveyard: zone([myGrave]),
        exile: zone([myForetold()]),
        command: zone([]),
        library: library(28, [topOfLibrary]),
      },
    },
    {
      id: 1, name: 'Opponent', isAi: true, life: 2, poison: 0, counters: {}, manaPool: pool(),
      zones: {
        hand: zone([hidden(201, 1), hidden(202, 1)]),
        battlefield: zone([ISLAND(210, 1, true), doombot({ blocking: true }), oppFaceDown({ blocking: true })]),
        graveyard: zone([oppGrave]),
        exile: zone([]),
        command: zone([]),
        library: library(31),
      },
    },
  ],
  stack: [
    {
      id: 88, sourceCardId: 102, controller: 0,
      text: 'Quantum Reduction (enchant creature) — targeting Aerial Doombot',
      targetCardIds: [211], targetPlayerIds: [],
    },
    // section 3.6 rule 1: `text` is "" when the bridge concealed it -- the
    // source card's identity is hidden from this seat, or the engine's string
    // mentioned the id of a card this frame concealed. The client renders the
    // absence (`stackTextLabel`); it must never print an empty line.
    {
      id: 89, sourceCardId: 213, controller: 1,
      text: '',
      targetCardIds: [], targetPlayerIds: [],
    },
  ],
  // §3.3: the card behind stack item 88. It is in ZoneType.Stack, so it is in no
  // player zone in this frame and `sourceCardId` resolves against nothing else.
  stackCards: [
    card({
      id: 102, name: 'Quantum Reduction', setCode: 'MSC', manaCost: '{1}{U}',
      types: 'Enchantment - Aura', zone: 'stack', controller: 0,
    }),
    // The source of stack item 89: an opponent's face-down permanent, still on
    // the battlefield (an ability's source usually is), which is exactly why
    // that item's `text` is "". Its state is public; its face is not.
    oppFaceDown({ blocking: true }),
  ],
  combat: {
    bands: [
      { attackerIds: [112], defender: { kind: 'player', id: 1 }, blockerIds: [211], damageOrder: [211] },
      { attackerIds: [114], defender: { kind: 'player', id: 1 }, blockerIds: [], damageOrder: [] },
      { attackerIds: [117], defender: { kind: 'player', id: 1 }, blockerIds: [213], damageOrder: [213] },
    ],
  },
  events: [
    { kind: 'phase', player: 0, phase: 'COMBAT_DECLARE_ATTACKERS' },
    { kind: 'attackers', player: 0, bands: [{ defender: { kind: 'player', id: 1 }, attackerIds: [112, 114, 117] }] },
    { kind: 'tap', cardId: 112, tapped: true },
    { kind: 'tap', cardId: 114, tapped: true },
    { kind: 'phase', player: 0, phase: 'COMBAT_DECLARE_BLOCKERS' },
    { kind: 'blockers', defendingPlayer: 1, blocks: [{ attackerId: 112, blockerIds: [211] }] },
    { kind: 'tap', cardId: 115, tapped: true },
    { kind: 'zone', cardId: 102, from: { zone: 'hand', player: 0 }, to: { zone: 'stack', player: null } },
    // §3.6: a token created straight onto the battlefield came from nowhere, and
    // one that ceases to exist goes nowhere. Both legs are null here on purpose.
    { kind: 'zone', cardId: 90, from: null, to: { zone: 'battlefield', player: 0 } },
    { kind: 'zone', cardId: 91, from: { zone: 'battlefield', player: 0 }, to: null },
    {
      kind: 'cast', stackId: 88, cardId: 102, controller: 0,
      text: 'Quantum Reduction (enchant creature) — targeting Aerial Doombot',
    },
    // The concealed twin: same gate, same "" (section 3.6 rule 1).
    { kind: 'cast', stackId: 89, cardId: 213, controller: 1, text: '' },
  ],
});

/*
 * §6 — a `notice`. A toast, never a question: anything the user must answer is
 * an `ask`, and a notice never blocks. Two of its three levels have a caller
 * today — `warn` for `flashIncorrectAction` / an `act` the engine refused, and
 * `error` for an `UNIMPL <name>` (an unimplemented `IGuiGame` member firing),
 * which §6 says must be visible in the browser *and* greppable in `var/*.log`.
 * This is the `warn` one: the shape a client sees when it clicks a creature
 * that cannot block.
 */
const noticeFrame = f(++seqS, clock + 9000, 's2c', 'notice', {
  level: 'warn',
  title: 'Illegal action',
  text: 'That creature cannot block.',
});

const over = f(++seqS, clock + 12000, 's2c', 'over', {
  winner: 0,
  reason: 'Opponent has lost the game.',
  matchOver: false,
});

const lines = [
  header, helloOk, mainOne, mainOneInput, clickQuantum,
  ...asks,
  surveilInput, pingOut, pongBack, resyncRequest, declareBlockers, noticeFrame, over,
];

writeFileSync(
  process.argv[2],
  lines.map((l) => JSON.stringify(l)).join('\n') + '\n',
  'utf8',
);
const kinds = new Set(asks.filter((l) => l.type === 'ask').map((l) => l.body.kind));
const types = new Set(lines.filter((l) => l.kind !== 'session').map((l) => l.type));
console.log(`wrote ${process.argv[2]}: 1 session header + ${lines.length - 1} frames ` +
  `(${lines.filter((l) => l.dir === 's2c').length} s2c, ${lines.filter((l) => l.dir === 'c2s').length} c2s), ` +
  `${kinds.size}/11 ask kinds: ${[...kinds].sort().join(', ')}`);
console.log(`  ${types.size}/11 frame types: ${[...types].sort().join(', ')}`);
