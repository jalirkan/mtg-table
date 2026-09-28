#!/usr/bin/env node
/*
 * mtg-table -- the M1 redaction test.
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Reads a recorded frame log (docs/protocol.md section 8) and asserts the
 * hidden-information invariants that the whole design rests on.  Plain Node,
 * no dependencies -- it has to be runnable before `web/` exists.
 *
 *   node tools/check-redaction.mjs fixtures/games/g1.jsonl [more.jsonl ...]
 *
 * Exits 0 if every file passes, 1 otherwise.
 *
 * Why this exists: Forge does NOT redact on the wire.  Its own
 * DeltaSyncManager.collectDeltas ships opponent hands and libraries and hides
 * them client-side, so the default failure mode of any new serialisation code
 * in the bridge is leaking the opponent's hand into a file we then commit to a
 * public repo.  Snap.java routes every CardView through one function gated on
 * CardView.canBeShownTo; this script is the proof that it worked.
 *
 * ---------------------------------------------------------------------------
 * 2026-09-11: docs/research/06-hidden-information-audit.md section 9, A1-A11.
 *
 *   A1  a `hidden` card's key set is EXACTLY {id, zone, owner, controller,
 *       hidden} -- a sixth key is a leak.
 *   A2  `hidden !== true` implies the object carries a `name`, so a
 *       half-redacted third shape cannot sneak in unnoticed.
 *   A3  `library` is {count, cards}; `cards` holds no stub, never exceeds
 *       `count`, and is WARNED about when it is non-empty for a seat other than
 *       the viewer.
 *   A4  every card in a non-viewer's hand is a stub, unless its id was already
 *       revealed (A6), and `hand.cards.length === hand.count`.
 *   A5  no name-bearing key anywhere under `state.events`.
 *   A6  NAME BEFORE REVEAL, the temporal one: a full card owned by someone else
 *       in a hidden zone must have been revealed earlier -- through a public
 *       zone, an `ask` body, `input.focusCard`, or the VIEWER'S OWN
 *       `library.cards`.  An opponent-library reveal (Opposition Agent,
 *       Bribery) is real but always transient, so it confers no permanent
 *       exemption and is WARNED about where it appears.
 *       ONE FRAME OF SLACK, and exactly one (2026-09-12): `WireGuiGame.ask()`
 *       flushes the `state` BEFORE it emits the ask, because report 06 W4 says
 *       that is the snapshot in which a temporarily revealed card is visible --
 *       so an `ask` may justify the `state` immediately before it, and nothing
 *       further back.  Negative control:
 *       fixtures/negative/redaction/a6-reveal-ask-one-frame-too-late.jsonl.
 *       P12's companion half: a `choose_list` with `reveal: true` is Forge's own
 *       `AbstractGuiGame.reveal(message, items)`, i.e. THE reveal channel, so
 *       its options are its own delayed reveal.  Without the flag, nothing
 *       changes.  Negative control:
 *       fixtures/negative/redaction/p12-choose-list-reveals-without-the-flag.jsonl.
 *       And the assertion that keeps that relaxation from spreading (added by
 *       the M6 verification pass): `reveal: true` on ANY kind other than
 *       `choose_list` is a FAILURE, because `reveal` is only ever
 *       `getChoices(min < 0)` and a flag the emitter writes cannot be allowed to
 *       switch P12 off for a kind nobody argued for.  Negative control:
 *       fixtures/negative/redaction/a7-reveal-flag-on-the-wrong-ask-kind.jsonl.
 *   A7  a hidden -> full transition with no `ask` behind it is WARNED about:
 *       continuous "may look" statics and mind-slave effects do that legally.
 *   A9  a face-down card names nothing unless this seat may flip it, and has no
 *       P/T outside the battlefield and the stack.
 *   A10 an id in parentheses inside an engine-built prompt is warned about
 *       unless that id was revealed (the engine builds those strings, not us).
 *   A11 every `ask.kind` is one of the ELEVEN documented kinds, and none of
 *       them is `open_zones` -- deleted, because opening a floating zone panel
 *       is not a question (report 06 section 3).
 *   A12 every `answer` closes an `ask` this same log opened, exactly once, and
 *       its `value` has the shape section 5.2 declares FOR THAT ASK'S KIND --
 *       including the three kinds whose answer may never be `null` (section 5.4
 *       / invariant 6: `order`, `choose_list` and `manipulate_list` all have
 *       call sites that dereference the result unguarded, so a null there does
 *       not degrade, it wedges or NPEs the game thread).
 *
 * A8 is a reducer unit test, not a log check: it lives in
 * web/test/reduce.test.ts, because a log cannot show what a client remembers.
 *
 * A6 IS A HARD FAILURE TODAY, AND M2 MAY HAVE TO WIDEN IT.  An M1 recording has
 * no `ask` frames at all, so every reveal in it would be unexplained and the
 * assertion is exact.  Report 07 W4 has `WireGuiGame` emit a `state` at the TOP
 * of every blocking method -- i.e. the snapshot showing the temporarily revealed
 * cards is written BEFORE the `ask` frame that justifies them.  When that lands,
 * widen "revealed earlier" to "revealed in the same flush window" rather than
 * deleting the assertion: it is the one check that would have caught every
 * P1-P7 regression in report 06.
 *
 * THE PRE-AMENDMENT TOLERANCE IS OPT-IN, AND NOTHING IN THE REPO OPTS IN.
 *
 * Amendments P1/P2/P3/P15 added keys (`owner` on the stub, `library.cards`,
 * `token`, `alt`) and retired one shape (the eleven-key `faceDownHidden`
 * object).  During the regeneration this script treated the ABSENCE of any of
 * those keys as a per-file WARN so that a not-yet-re-recorded fixture could
 * still be read.  That was a mistake and it was measured: five one-defect probes
 * against fixtures/games/g1.jsonl -- delete `owner` from a stub, delete `token`
 * from a card, delete `alt`, delete `library.cards`, revive a `faceDownHidden`
 * object -- ALL PASSED.  A Snap.java regression that reverted any amendment of
 * this pass would have walked through check-all.sh with exit 0, which is the one
 * thing step 6 exists to stop.
 *
 * So the tolerance now lives behind an explicit `--pre-amendment` flag, and no
 * committed file and no line of check-all.sh passes it.  For every ordinary
 * invocation:
 *
 *   - a redacted stub missing `owner`        -> FAIL (A1/P1)
 *   - a full card missing `token` or `alt`   -> FAIL (P15/P3)
 *   - a `library` missing `cards`            -> FAIL (A3/P2)
 *   - ANY object carrying `faceDownHidden`   -> FAIL (superseded by P3)
 *
 * `--pre-amendment` downgrades exactly those four to the old per-file WARN, for
 * reading a log recorded before 2026-09-11 that cannot be re-recorded.  It is
 * not a way to land a new file.  A key this script does NOT know about is a
 * failure in either mode -- tolerance was only ever for absent fields, never for
 * extra ones.
 *
 * tools/check-redaction-selftest.sh is the negative control for all of this:
 * it mutates one fixture in one place per probe and asserts THIS SCRIPT FAILS.
 *
 * ---------------------------------------------------------------------------
 * AN OPPONENT'S LIBRARY DUMPED AS FULL CARDS IS A FAILURE, NOT A WARNING.
 *
 * A3 used to WARN when a seat other than the viewer carried full cards in
 * `library.cards`, on the grounds that Opposition Agent / Bribery / Gonti make
 * the shape legitimately reachable.  That is true and it was still the wrong
 * default: an opponent's library is the single largest hidden-information
 * surface in the game, the effects that open it are rare enough that no
 * committed recording contains one, and a warning in a 1,200-line script's
 * output is indistinguishable from silence in CI.  So it FAILS, and a recording
 * that genuinely exercises a look-at-an-opponent's-library effect declares that
 * on the command line:
 *
 *   node tools/check-redaction.mjs --opponent-library-ok fixtures/games/bribery.jsonl
 *
 * The flag downgrades exactly that one assertion back to a WARN and nothing
 * else -- in particular it does NOT relax A6, so an id revealed out of an
 * opponent's library still buys no permanent name-before-reveal exemption
 * (fixtures/negative/redaction/a6-library-reveal-is-not-a-whitelist.jsonl).
 * ---------------------------------------------------------------------------
 */

import { readFileSync, statSync } from 'node:fs';

const PROTOCOL_VERSION = 1;

/**
 * A1 / amendment P1: exactly the keys a redacted card is allowed to carry
 * (protocol section 3.3).  `owner` is the fifth: canBeShownTo's `case Hand`
 * compares CONTROLLERS while the zone arrays are keyed by the zone's player, so
 * without it the client cannot tell whose card a stub is when the two diverge.
 * An owner id is not identity-bearing.
 */
const REDACTED_KEYS = ['id', 'zone', 'owner', 'controller', 'hidden'];

/** A11 / amendment P6: the eleven ask kinds.  `open_zones` is deleted. */
const ASK_KINDS = new Set([
  'ability_menu', 'confirm', 'options', 'text', 'choose_list', 'order',
  'choose_entities', 'assign_damage', 'assign_amount', 'manipulate_list',
  'sideboard',
]);

/**
 * A12 / protocol section 5.2 -- the shape of `answer.value`, per ask kind.
 *
 * The checker only ever saw `ask` frames before: an answer was an opaque blob,
 * so `{"askId":"a7","value":null}` for an `order` -- which
 * `IGuiGame.java:229,232` and `PlayerControllerHuman.java:2317` all dereference
 * with a bare `.ordered()` -- read exactly like a legal cancel.  Each entry
 * says whether `null` is a legal answer for that kind and validates the
 * non-null shape; `count` is the size of the ask's option array (see
 * `optionCount`) so an index can be bounds-checked, or `null` when the ask body
 * did not carry one.
 *
 * A rule returns `null` when the value is fine, or a phrase naming what
 * section 5.2 wanted instead.
 */
const ANSWER_RULES = {
  // "option index, or null" -- getAbilityToPlay / showOptionDialog.
  ability_menu: { nullOk: true, rule: (v, n) => indexValue(v, n) },
  options: { nullOk: true, rule: (v, n) => indexValue(v, n) },
  // "true | false | null".
  confirm: { nullOk: true, rule: (v) => (bool(v) ? null : 'a boolean') },
  // "string, or null".
  text: { nullOk: true, rule: (v) => (str(v) ? null : 'a string') },
  /*
   * NOT nullable.  Section 5.4 and invariant 6: `AbstractGuiGame.java:767,
   * 780-781` dereference `getChoices`'s result, so the bridge synthesises a
   * default rather than completing the future with null.
   */
  choose_list: { nullOk: false, rule: (v, n) => indexArrayValue(v, n) },
  /*
   * NOT nullable, and not an array either: Forge's `OrderResult` is
   * `record(List<T> ordered, boolean rememberDecision)`, and `ordered`
   * addresses `dest ++ source` as ONE array (section 5.1, "one ask, one option
   * array").
   */
  order: { nullOk: false, rule: (v, n) => orderValue(v, n) },
  choose_entities: { nullOk: true, rule: (v, n) => indexArrayValue(v, n) },
  // `{ "<index>": n, ... }`, or null -- null means "let Forge assign"
  // (PlayerControllerHuman.java:302-304).
  assign_damage: { nullOk: true, rule: (v, n) => amountMapValue(v, n) },
  assign_amount: { nullOk: true, rule: (v, n) => amountMapValue(v, n) },
  /*
   * NOT nullable: `PlayerControllerHuman.java:986` indexes the result
   * directly, so its null default is the input list in its original order --
   * which means the answer is always the FULL list, permuted.
   */
  manipulate_list: { nullOk: false, rule: (v, n) => permutationValue(v, n) },
  sideboard: { nullOk: true, rule: (v, n) => indexArrayValue(v, n) },
};

/** The size of the option array an `answer`'s indices address, or null. */
function optionCount(body) {
  if (!plainObject(body)) return null;
  const len = (a) => (Array.isArray(a) ? a.length : null);
  switch (body.kind) {
    case 'ability_menu':
    case 'options':
    case 'choose_list':
    case 'choose_entities':
      return len(body.options);
    case 'assign_damage':
    case 'assign_amount':
      return len(body.targets);
    case 'manipulate_list':
      return len(body.cards);
    // Section 5.1: a kind with two lists is presenting ONE server-side array in
    // two halves, and the ids run across both in the order section 5.2 names.
    case 'order':
      return len(body.dest) === null || len(body.source) === null
        ? null
        : body.dest.length + body.source.length;
    case 'sideboard':
      return len(body.main) === null || len(body.side) === null
        ? null
        : body.main.length + body.side.length;
    default:
      return null;
  }
}

/**
 * `n` is the ask's option count, or `null` when the body carried no option list
 * this checker knows how to count -- in which case an index is bounds-free and
 * only its type is asserted.  Better a narrower check than a wrong one.
 */
const inRange = (v, n) => num(v) && Number.isInteger(v) && v >= 0 && (n === null || v < n);
const rangeText = (n) => (n === null ? 'a non-negative integer' : `in [0, ${n})`);

function indexValue(v, n) {
  if (!num(v) || !Number.isInteger(v)) return 'an option index (an integer)';
  if (!inRange(v, n)) return `an option index ${rangeText(n)} -- got ${v}`;
  return null;
}

function indexArrayValue(v, n) {
  if (!Array.isArray(v)) return 'an array of option indices';
  for (const i of v) {
    if (!inRange(i, n)) return `every entry to be an option index ${rangeText(n)}`;
  }
  return null;
}

function orderValue(v, n) {
  if (!plainObject(v) || !sameKeys(v, ['ordered', 'remember'])) {
    return '`{ordered, remember}` -- Forge\'s OrderResult is (List, boolean), not {top, bottom}';
  }
  if (!bool(v.remember)) return '`remember` to be a boolean';
  // `ordered` is the DESTINATION list and may be shorter than the option array
  // (section 5.3: min/max are Forge's remainingMin/remainingMax, constraining
  // what is LEFT in source), so this bounds the indices and not the length.
  return indexArrayValue(v.ordered, n) === null
    ? null
    : `\`ordered\` to be option indices into dest ++ source, ${rangeText(n)}`;
}

function amountMapValue(v, n) {
  if (!plainObject(v)) return 'a `{"<option index>": amount}` object';
  for (const [k, amount] of Object.entries(v)) {
    if (!/^\d+$/.test(k) || !inRange(Number(k), n)) {
      return `every key to be an option index ${rangeText(n)} -- got ${JSON.stringify(k)}`;
    }
    if (!num(amount) || !Number.isInteger(amount)) return 'every value to be an integer amount';
  }
  return null;
}

function permutationValue(v, n) {
  const bad = indexArrayValue(v, n);
  if (bad !== null) return bad;
  if (n === null) return null;
  // Section 5.2: manipulate_list's answer is "the full list in its new order",
  // and PlayerControllerHuman indexes it -- a short answer is an index error
  // waiting to happen, not a partial selection.
  if (v.length !== n) return `all ${n} indices (the full list, reordered) -- got ${v.length}`;
  if (new Set(v).size !== v.length) return 'each index exactly once (it is a permutation)';
  return null;
}

/** A5: keys that carry a card identity and may never appear under `events`. */
const NAME_BEARING_KEYS = [
  'name', 'cardName', 'oracleText', 'rulesText', 'abilityText',
  'targetDescription', 'stackDescription', 'matchSummary', 'outcomeStrings',
];

/** Zones a card is public in, for the "ever revealed" set of A6. */
const PUBLIC_ZONES = ['battlefield', 'graveyard', 'command'];

// ======================================================================
// Shape assertions -- the second half of this script's job.
//
// The first half proves nothing leaked.  This half proves the Java emitter
// and web/src/protocol.ts still describe the same bytes: for every object in
// a `state` body it asserts the EXACT key set and the runtime type of every
// key against docs/protocol.md.
//
// It exists because M1 shipped a renderer crash that every other check
// passed: Snap.java emitted `"from": null` for a token entering the
// battlefield from nowhere while protocol.ts declared `from: ZoneRef`, and
// nothing between the two ends ever compared them.  reduce() partitions
// events on `kind` and never looks at a body, so a null sails straight into
// the renderer wearing a non-null type.  A key-set-and-type check over the
// committed fixtures is the cheapest place to catch that, and it fails here
// instead of in a browser tab.
// ======================================================================

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const str = (v) => typeof v === 'string';
const bool = (v) => typeof v === 'boolean';
const isTrue = (v) => v === true;
const nullable = (f) => (v) => v === null || f(v);
/**
 * A key this checker knows about but tolerates the ABSENCE of, because every
 * committed recording predates the amendment that added it.  `checkShape`
 * records each absence so the per-file summary can say what the recording
 * cannot evidence.  An unknown key is still a hard failure.
 */
const sinceAmendment = (f, amendment) => {
  const g = (v) => f(v);
  g.sinceAmendment = amendment;
  return g;
};
/**
 * A key whose ABSENCE is protocol, not drift (M6, amendments M32-M36 and M39).
 *
 * The comfort fields -- `players[].phaseStops`, `state.yield`, `state.undo`,
 * `stack[].yieldKey` and friends, `input.buttons.focus` -- are answered by a
 * SEAT.  An AI-vs-AI `RecordMatch` recording has no seat, no phase stops and no
 * undo stack, and writing empty ones would invent state that does not exist; and
 * every log recorded before 2026-09-12 predates them.  So: present means
 * type-checked, absent means counted.  That is deliberately weaker than
 * `sinceAmendment`, which fails unless `--pre-amendment` is passed, because
 * these keys have a legitimate permanent absence and those do not.
 *
 * **But absence is all-or-nothing, and that part IS a failure.**  A per-key
 * "absent is fine" rule made every comfort key optional in every file, so a
 * bridge that stopped writing `players[].phaseStops` while still writing
 * `state.yield` and `state.undo` would have passed this checker over all 18
 * committed fixtures and every fresh log in the gate -- the exact drift this
 * file exists to catch, waved through by the tolerance meant for OLD files.
 * An old file has NONE of them; a broken emitter has SOME.  So a file that
 * carries any comfort key must carry every comfort key whose shape it
 * evaluates, and a mixture is a hard problem (see `comfortSplit`).
 *
 * What this deliberately does not do is require the block of a seat recording
 * that predates M6: eight committed `human-*.jsonl` fixtures are M5 probe
 * evidence, were never re-recorded, and have a seat and a `transport` and no
 * comfort fields at all.  That residual gap is covered by
 * `tools/ten-games.sh` assertion 6b and by check-all 10g's effect assertions,
 * which run against a FRESH bridge rather than against the corpus.
 */
const optional = (f) => {
  const g = (v) => f(v);
  g.optionalKey = true;
  return g;
};
const arrayOf = (f) => (v) => Array.isArray(v) && v.every(f);
const plainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const mapOf = (f) => (v) => plainObject(v) && Object.values(v).every(f);
const oneOf = (...values) => (v) => values.includes(v);

/** `{"kind":"player"|"card","id":n}` -- protocol section 3.1. */
const entityRef = (v) =>
  plainObject(v) &&
  sameKeys(v, ['kind', 'id']) &&
  oneOf('player', 'card')(v.kind) &&
  num(v.id);

/** `{"zone":"hand","player":0|null}` -- protocol section 3.6. */
const zoneRef = (v) =>
  plainObject(v) && sameKeys(v, ['zone', 'player']) && str(v.zone) && nullable(num)(v.player);

function sameKeys(o, keys) {
  const a = Object.keys(o).sort();
  const b = [...keys].sort();
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

/**
 * Protocol section 3.6.  Every event kind, its exact key set, and the type of
 * every key.  A field is nullable here ONLY where the protocol says it is
 * nullable by design: an event whose subject id is missing is dropped by the
 * bridge, never emitted with a null (section 3.6 rule 5).
 */
const EVENT_SHAPES = {
  zone:       { cardId: num, from: nullable(zoneRef), to: nullable(zoneRef) },
  cast:       { stackId: num, cardId: num, controller: num, text: str },
  resolved:   { cardId: num, fizzled: bool },
  unstacked:  { cardId: num },
  attackers:  { player: num, bands: arrayOf(attackBand) },
  blockers:   { defendingPlayer: num, blocks: arrayOf(blockAssignment) },
  damage:     { target: entityRef, sourceCardId: num, amount: num, combat: bool,
                damageType: nullable(str) },
  life:       { player: num, from: num, to: num },
  poison:     { player: num, sourcePlayer: nullable(num), from: num, amount: num },
  tap:        { cardId: num, tapped: bool },
  counters:   { cardId: num, counter: str, from: num, to: num },
  attach:     { cardId: num, to: nullable(entityRef) },
  sacrificed: { cardId: num },
  land:       { player: num, cardId: num },
  stats:      { cardIds: arrayOf(num), transform: bool },
  turn:       { player: num, turn: num },
  phase:      { player: num, phase: str },
  combat_end: { attackerIds: arrayOf(num), blockerIds: arrayOf(num) },
  shuffle:    { player: num },
  mulligan:   { player: num },
  outcome:    { winner: nullable(num), lastTurn: num },
  // Amendment P4 / report 06 section 5.3.  All four carry counts and ids only.
  scry:       { player: num, toTop: num, toBottom: num },
  surveil:    { player: num, toLibrary: num, toGraveyard: num },
  phased:     { cardId: num, phasedOut: bool },
  // javap against the 2.0.14 jar: GameEventCardForetold's only component is
  // activatingPlayer(). There is no card accessor to build a {cardId} from, so
  // the body is {player} -- and a bridge that emits {cardId} instead is drift
  // this accepts for one release rather than failing a fixture over a name.
  foretold:   { player: num },
};

function attackBand(v) {
  // section 3.1: every `defender` on the wire is nullable.
  return (
    plainObject(v) &&
    sameKeys(v, ['defender', 'attackerIds']) &&
    nullable(entityRef)(v.defender) &&
    arrayOf(num)(v.attackerIds)
  );
}

function blockAssignment(v) {
  return (
    plainObject(v) &&
    sameKeys(v, ['attackerId', 'blockerIds']) &&
    num(v.attackerId) &&
    arrayOf(num)(v.blockerIds)
  );
}

/**
 * Protocol section 3.2 -- a card the viewer may see.
 *
 * `controller` / `owner`: a number for a card in a player zone, where the
 * bridge's fallback hint is that zone's player and cannot be missing. On
 * `stackCards` the hint is `StackItemView.getActivatingPlayer()`, which Forge
 * declares nullable (it is why `stack[].controller` is nullable), so both may be
 * null there and only there -- hence `onStack` below rather than a blanket
 * `nullable`, which would stop this file catching a null in a hand.
 */
const VISIBLE_CARD_SHAPE = {
  id: num,
  name: str,
  setCode: nullable(str),
  // section 3.2: null for a card with no mana cost -- never "" and never
  // Forge's internal "no cost".
  manaCost: (v) => v === null || (str(v) && v !== '' && v !== 'no cost'),
  // Always a string, "" when Forge has nothing -- including a face-down card
  // outside the battlefield and the stack, where CardStateView.getType() is
  // CardType.EMPTY and the "2/2 Creature" is an artifact of the face-down state
  // object (amendment P3 / report 06 section 1.4).  A renderer never branches
  // on absence, and "" is the one spelling of "nothing here".
  types: str,
  power: nullable(str),
  toughness: nullable(str),
  loyalty: nullable(str),
  damage: num,
  counters: mapOf(num),
  tapped: bool,
  sick: bool,
  attacking: bool,
  blocking: bool,
  faceDown: bool,
  // Amendment P15 -- CardView.isToken(), javap-confirmed.
  token: sinceAmendment(bool, 'P15 (token)'),
  // Amendment P3 -- the real face, emitted ONLY when
  // cv.isFaceDown() && cv.canFaceDownBeShownTo(viewer). A9 below is what
  // actually checks the gate; this only pins the shape.
  alt: sinceAmendment(
    nullable((v) =>
      plainObject(v) &&
      sameKeys(v, ['name', 'manaCost', 'types', 'power', 'toughness']) &&
      str(v.name) && nullable(str)(v.manaCost) && str(v.types) &&
      nullable(str)(v.power) && nullable(str)(v.toughness)),
    'P3 (alt)',
  ),
  attachedToId: nullable(num),
  attachmentIds: arrayOf(num),
  controller: num,
  owner: num,
  zone: str,
  abilities: arrayOf(
    (a) =>
      plainObject(a) &&
      sameKeys(a, ['id', 'text', 'canPlay', 'isSpell']) &&
      num(a.id) && str(a.text) && bool(a.canPlay) && bool(a.isSpell),
  ),
};

/** Section 3.3 gate 1 (A1 / amendment P1) -- five keys and nothing else. */
const REDACTED_CARD_SHAPE = {
  id: num,
  zone: str,
  controller: num,
  owner: sinceAmendment(num, 'P1 (owner on the redacted stub)'),
  hidden: isTrue,
};

/** Section 3.3 gate 2 -- the public half of a face-down permanent, and no identity. */
const FACE_DOWN_CARD_SHAPE = {
  id: num,
  zone: str,
  controller: num,
  faceDownHidden: isTrue,
  tapped: bool,
  attacking: bool,
  blocking: bool,
  damage: num,
  counters: mapOf(num),
  power: nullable(str),
  toughness: nullable(str),
};

/**
 * Section 3.1, amendment M36.  A `yieldKey` is a BRIDGE-MINTED handle and the
 * one thing this checker can prove about it mechanically is that it is not
 * Forge's own key: `StackItemView.getKey()` is
 * `CardView.toString() + ": " + the ability's text`, and `CardView.toString()`
 * is `"<zone> <name> (<id>)"` -- so a raw key always contains **a space and a
 * `(`**, and a handle never does.  Two characters are the whole assertion, and
 * they are enough: every way of leaking the key leaks the parenthesised id with
 * it.
 */
const yieldHandle = (v) =>
  typeof v === 'string' && v.length > 0 && !v.includes(' ') && !v.includes('(');

const STACK_ITEM_SHAPE = {
  id: num,
  // A stack item is never dropped, so these two are nullable by design
  // (section 3.1) -- unlike every id in an event.
  sourceCardId: nullable(num),
  controller: nullable(num),
  text: str,
  targetCardIds: arrayOf(num),
  targetPlayerIds: arrayOf(num),
  // M6 (amendment M36).  `yielded` is three-valued, not a boolean: it is the
  // engine's standing answer for this key, and "no standing answer" is not the
  // same statement as "declined".
  yieldKey: optional(nullable(yieldHandle)),
  isAbility: optional(bool),
  isOptionalTrigger: optional(bool),
  yielded: optional(nullable(oneOf('yes', 'no'))),
};

const COMBAT_BAND_SHAPE = {
  attackerIds: arrayOf(num),
  defender: nullable(entityRef),
  blockerIds: arrayOf(num),
  damageOrder: arrayOf(num),
};

const PLAYER_SHAPE = {
  id: num,
  name: str,
  isAi: bool,
  life: num,
  poison: num,
  counters: mapOf(num),
  manaPool: (v) =>
    plainObject(v) && sameKeys(v, ['W', 'U', 'B', 'R', 'G', 'C']) && Object.values(v).every(num),
  zones: plainObject,
  // M6, amendment M32.  TWO sets: `own` is where the game stops while this
  // player is the turn player, `opp` while anybody else is.  UNTAP is in
  // neither -- it has no preference and no priority pass -- and this checker
  // says so, because a client that saw UNTAP here would draw a cell that can
  // never do anything.
  phaseStops: optional(
    (v) =>
      plainObject(v) &&
      sameKeys(v, ['own', 'opp']) &&
      arrayOf(str)(v.own) &&
      arrayOf(str)(v.opp) &&
      !v.own.includes('UNTAP') &&
      !v.opp.includes('UNTAP'),
  ),
};

const STATE_SHAPE = {
  gameId: str,
  turn: num,
  round: num,
  phase: nullable(str),
  activePlayer: nullable(num),
  priority: nullable(num),
  // section 7: `reason` is nullable. Snap.state() writes this body the instant
  // game.isGameOver() is true, and GameView.getOutcome() is a lookup in the
  // Match's outcome map, which is not populated at the same instant -- a
  // snapshot in that window genuinely has no win condition to report.
  gameOver: nullable(
    (v) =>
      plainObject(v) &&
      sameKeys(v, ['winner', 'reason', 'matchOver']) &&
      nullable(num)(v.winner) && nullable(str)(v.reason) && bool(v.matchOver),
  ),
  players: Array.isArray,
  stack: Array.isArray,
  stackCards: Array.isArray,
  combat: nullable((v) => plainObject(v) && sameKeys(v, ['bands']) && Array.isArray(v.bands)),
  events: Array.isArray,
  // M6, amendment M34.  One object and not three flags, because Forge allows
  // one yield at a time: every setter clears the other two.
  yield: optional(
    nullable(
      (v) =>
        plainObject(v) &&
        sameKeys(v, ['kind', 'playerId', 'phase']) &&
        oneOf('endOfTurn', 'marker', 'stack')(v.kind) &&
        nullable(num)(v.playerId) &&
        nullable(str)(v.phase),
    ),
  ),
  // M6, amendment M35.
  undo: optional(
    nullable((v) => plainObject(v) && sameKeys(v, ['can', 'depth']) && bool(v.can) && num(v.depth)),
  ),
};

/**
 * Section 6.  A notice is a toast and carries three keys, and BOTH of its
 * strings are engine strings: `IGuiGame.message(message, title)` is passed
 * `CardView.get(sa.getHostCard()).toString()` as the title by
 * `PlayerControllerHuman.notifyOfValue`, i.e. Forge's own `name (id)`.  Until
 * the bridge gated them, a `notice` body got no shape check and no scan at all
 * -- and a measured one read `{"title":"Thriving Isle (49)"}` in a game where
 * card 49 was a hidden stub in the opponent's hand.
 */
const NOTICE_SHAPE = {
  level: oneOf('info', 'warn', 'error'),
  title: str,
  text: str,
};

/** Section 7.  The same three keys as `state.gameOver`, and the same nullability. */
const OVER_SHAPE = {
  winner: nullable(num),
  reason: nullable(str),
  matchOver: bool,
};

/**
 * Section 5.1.  An option's identity keys are "present iff" -- `cardId` iff it
 * is a CardView, `playerId` iff a PlayerView, and so on -- so the key SET
 * legitimately varies and only the common three are required.  What is checked
 * is that every key is one this document names: a new key on an option is how a
 * second, ungated stringifier arrives.
 */
const OPTION_KEYS = new Set([
  'id', 'label', 'kind', 'cardId', 'playerId', 'abilityId', 'card',
  'canPlay', 'isSpell', 'lethal', 'defender', 'max',
]);
const OPTION_KINDS = new Set([
  'card', 'player', 'ability', 'color', 'number', 'text', 'other', 'entity',
]);
const askOption = (v) =>
  plainObject(v) && num(v.id) && str(v.label) && OPTION_KINDS.has(v.kind) &&
  Object.keys(v).every((k) => OPTION_KEYS.has(k));

/** Section 5.3.  `DelayedReveal` is the context, not the choice. */
const delayedRevealShape = (v) =>
  plainObject(v) && sameKeys(v, ['owner', 'zones', 'messagePrefix', 'cards']) &&
  nullable(num)(v.owner) && arrayOf(str)(v.zones) && str(v.messagePrefix) && Array.isArray(v.cards);

/**
 * Section 5.2, per kind: the exact key set of an `ask` body beyond the three
 * envelope keys every kind carries, and the runtime type of each.
 *
 * **This is where declared nullability lives.**  Three fields had a live null
 * path in the emitter that neither section 5.2 nor `web/src/protocol.ts`
 * admitted -- `ability_menu.cardId` (null host), `assign_damage.attackerId`
 * (null attacker) and `text.initial` (a null `initialInput` writes a JSON
 * null) -- and nothing compared the two ends, because an `ask` body had no
 * shape check at all.  Nine of the eleven kinds have never been dispatched by
 * Forge in a recording, so for those this table and
 * `fixtures/synthetic/sample-handwritten.jsonl` are the whole of the contract.
 */
const ASK_COMMON = { askId: str, kind: str, timeoutMs: num };
const ASK_SHAPES = {
  // cardId is NOT nullable: with no host card there is nothing to attach a menu
  // to, so the bridge skips the ask entirely rather than emitting a null.
  ability_menu: { cardId: num, options: arrayOf(askOption) },
  confirm: {
    prompt: str, title: str, yesLabel: str, noLabel: str,
    defaultYes: bool, card: nullable(plainObject),
  },
  options: {
    prompt: str, title: str, options: arrayOf(askOption),
    defaultIndex: num, card: nullable(plainObject),
  },
  // `initial` is a string, "" when Forge has none -- like every other string
  // field on the wire.  A null here was a shape neither end declared.
  text: { prompt: str, title: str, initial: str, suggestions: arrayOf(str), numeric: bool },
  choose_list: {
    prompt: str, options: arrayOf(askOption), preselected: arrayOf(num),
    min: num, max: num, reveal: bool,
  },
  order: {
    prompt: str, destLabel: str, source: arrayOf(askOption), dest: arrayOf(askOption),
    min: num, max: num, referenceCardId: nullable(num),
    sideboardMode: bool, showRemember: bool,
  },
  choose_entities: {
    prompt: str, options: arrayOf(askOption), min: num, max: num,
    delayedReveal: nullable(delayedRevealShape),
  },
  // attackerId IS nullable, declared at both ends: Forge's signature allows a
  // null attacker and the emitter cannot prove it never happens, so the type
  // says what the code can do rather than what a run happened to produce.
  assign_damage: {
    attackerId: nullable(num), total: num, overrideOrder: bool, maySkip: bool,
    targets: arrayOf(askOption),
  },
  assign_amount: {
    sourceCardId: nullable(num), total: num, atLeastOne: bool, label: str,
    targets: arrayOf(askOption),
  },
  manipulate_list: {
    prompt: str, cards: arrayOf(askOption), manipulable: arrayOf(num),
    toTop: bool, toBottom: bool, toAnywhere: bool,
  },
  sideboard: { prompt: str, main: arrayOf(askOption), side: arrayOf(askOption) },
};

/**
 * Assert one object against a shape: the exact key set, then every type.
 * Returns an array of complaints (empty when it matches).
 */
function checkShape(value, shape, where, missed = null) {
  if (!plainObject(value)) return [`${where} is not an object`];
  const out = [];
  const expected = Object.keys(shape);
  const actual = Object.keys(value);
  for (const k of actual) {
    if (!(k in shape)) out.push(`${where} has an unexpected key "${k}"`);
  }
  for (const k of expected) {
    if (!(k in value)) {
      // A key the protocol allows to be absent (M6's comfort fields): counted
      // for the summary, never a complaint.  See `optional`.
      if (shape[k].optionalKey) {
        if (missed !== null && missed.optional) missed.optional.add(k);
        continue;
      }
      // A key added by an amendment is tolerated ONLY under --pre-amendment
      // (see the header): otherwise an emitter that stopped writing it reads as
      // an old recording, and the drift this file exists to catch goes unseen.
      const since = shape[k].sinceAmendment;
      if (since !== undefined && missed !== null && missed.tolerant) {
        missed.add(since);
        continue;
      }
      out.push(
        `${where} is missing "${k}"` +
          (since === undefined
            ? ''
            : ` -- amendment ${since}. Every emitter writes it; if this file ` +
              `genuinely predates the amendment, pass --pre-amendment`),
      );
      continue;
    }
    if (shape[k].optionalKey && missed !== null && missed.optionalPresent) {
      missed.optionalPresent.add(k);
    }
    if (!shape[k](value[k])) {
      out.push(
        `${where}.${k} = ${JSON.stringify(value[k])} does not match the type ` +
          `docs/protocol.md declares for it`,
      );
    }
  }
  return out;
}

/**
 * Any of the three card shapes, chosen the way the renderer chooses.
 *
 * @param onStack a `stackCards` entry, where `controller` and `owner` are the
 *   only two fields the protocol allows to be null (see VISIBLE_CARD_SHAPE).
 */
function checkCard(card, where, onStack = false, missed = null) {
  if (!plainObject(card)) return [`${where} is not an object`];
  const relax = (shape) => {
    if (!onStack) return shape;
    const owner = 'owner' in shape
      ? { owner: shape.owner.sinceAmendment !== undefined
            ? sinceAmendment(nullable(num), shape.owner.sinceAmendment)
            : nullable(num) }
      : {};
    return { ...shape, ...owner, controller: nullable(num) };
  };
  if (card.hidden === true) {
    // A1: any sixth key here is a leak, and checkShape says exactly which.
    return checkShape(card, relax(REDACTED_CARD_SHAPE), `${where} (redacted)`, missed);
  }
  if (card.faceDownHidden === true) {
    // The superseded gate-2 shape (amendment P3 replaced it with the ordinary
    // full branch: faceDown + name "" + alt). Still READ, so a pre-amendment
    // recording is still fully audited -- but its presence is itself a failure
    // unless this file is declared pre-amendment, because no current emitter can
    // produce one and a revived `faceDownHidden` object means Snap.java drifted.
    const out = checkShape(card, relax(FACE_DOWN_CARD_SHAPE), `${where} (face-down)`, missed);
    if (missed !== null && missed.tolerant) {
      missed.add('P3 (faceDownHidden retired for faceDown + alt)');
    } else {
      out.push(
        `${where} is an eleven-key "faceDownHidden" object -- amendment P3 retired that ` +
          `shape: a face-down card takes the full branch with name "" and alt null ` +
          `(docs/protocol.md section 3.3). No emitter writes this any more`,
      );
    }
    return out;
  }
  const out = checkShape(card, relax(VISIBLE_CARD_SHAPE), where, missed);
  // A2: a card that is not a stub carries a name. Catches a half-redacted third
  // shape -- exactly what faceDownHidden was -- sneaking in unannounced.
  if (!('name' in card)) {
    out.push(`${where} is neither hidden nor named -- a third, half-redacted card shape (A2)`);
  }
  return out;
}

// ======================================================================
// The text half of hidden information (protocol section 3.6 rule 1).
//
// `stack[].text` and `events[].cast.text` are the only two strings on the wire
// that come out of the engine, and for one milestone they were completely
// ungated on the assumption that a stack description is public.  It is not:
// a face-down creature's death trigger came out as
//
//   "When Ashcloud Phoenix dies, return it to the battlefield face down under
//    your control. [Zone Changer: Ashcloud Phoenix (75)]"
//
// in the same frame that serialised card 75 as `faceDownHidden` -- the name,
// and the id to join it to the concealed card.  Nothing here or in
// web/test/fixtures.test.ts read the CONTENT of a text field, so every test
// passed.  These two rules read it.
// ======================================================================

/** `Card.toString()` is `name (id)`; this finds the id half. */
const CARD_REF = /\((\d{1,9})\)/g;

/**
 * Forge's engine-debug annotation, `WrappedAbility.getStackDescription` ->
 * `" [" + Trigger.getImportantStackObjects(sa) + "]"`, whose payload is
 * `Card.toString()`. The bridge strips it; a survivor means it did not.
 */
const ENGINE_ANNOTATION = /\[[^[\]]*:[^[\]]*\]\s*$/;

/**
 * Every card id one `state` body conceals, with the shape that concealed it.
 * Section 3.3: those are the two shapes, and nothing else in the frame may
 * make them identifiable.
 */
function concealedIds(body) {
  const out = new Map();
  const add = (c) => {
    if (!plainObject(c)) return;
    if (c.hidden === true) out.set(c.id, { how: 'hidden', controller: c.controller });
    else if (c.faceDownHidden === true) out.set(c.id, { how: 'faceDownHidden', controller: c.controller });
  };
  for (const p of body.players ?? []) {
    for (const [zname, z] of Object.entries(p.zones ?? {})) {
      if (zname === 'library' || !plainObject(z) || !Array.isArray(z.cards)) continue;
      for (const c of z.cards) add(c);
    }
  }
  for (const c of body.stackCards ?? []) add(c);
  return out;
}

/**
 * The leak rule. For every engine string in this frame, every `(<id>)` it
 * mentions must not be an id this same frame concealed from the viewer.
 *
 * `seat` is the viewing player id: a card the viewer controls is concealed from
 * *the opponent*, not from the reader of this log, so the reader's own
 * face-down permanent naming itself is not a leak.
 */
function checkTexts(body, seat) {
  const out = [];
  const concealed = concealedIds(body);
  const texts = [];
  for (let i = 0; i < (body.stack ?? []).length; i++) {
    if (str(body.stack[i]?.text)) texts.push([`state.stack[${i}].text`, body.stack[i].text]);
  }
  for (let i = 0; i < (body.events ?? []).length; i++) {
    const ev = body.events[i];
    if (plainObject(ev) && ev.kind === 'cast' && str(ev.text)) {
      texts.push([`state.events[${i}].cast.text`, ev.text]);
    }
  }

  for (const [where, text] of texts) {
    for (const m of text.matchAll(CARD_REF)) {
      const id = Number(m[1]);
      const hit = concealed.get(id);
      if (hit === undefined) continue;
      if (hit.controller === seat) continue;   // the viewer's own concealed card
      out.push(
        `${where} mentions card #${id}, which THIS FRAME emitted as ` +
          `"${hit.how}": ${JSON.stringify(text)} -- a concealed card's identity ` +
          `must not be joinable from an engine string (section 3.6 rule 1)`,
      );
    }
    if (ENGINE_ANNOTATION.test(text)) {
      out.push(
        `${where} still carries Forge's engine-debug annotation ` +
          `(\`[Label: Name (id)]\`): ${JSON.stringify(text)} -- Snap.stackText strips it`,
      );
    }
  }
  return out;
}

/** Every shape assertion for one `state` body.  Returns complaints. */
function checkStateShape(body, missed) {
  const out = [...checkShape(body, STATE_SHAPE, 'state', missed)];

  for (let i = 0; i < (body.players ?? []).length; i++) {
    const p = body.players[i];
    out.push(...checkShape(p, PLAYER_SHAPE, `state.players[${i}]`, missed));
    const zones = plainObject(p) && plainObject(p.zones) ? p.zones : {};
    if (!sameKeys(zones, ['hand', 'battlefield', 'graveyard', 'exile', 'command', 'library'])) {
      out.push(`state.players[${i}].zones has keys ${Object.keys(zones).sort().join(',')} -- ` +
        `protocol section 3.1 names exactly six`);
    }
    for (const [zname, z] of Object.entries(zones)) {
      if (zname === 'library') continue;
      if (!plainObject(z) || !Array.isArray(z.cards)) continue;   // reported elsewhere
      for (let c = 0; c < z.cards.length; c++) {
        out.push(...checkCard(z.cards[c], `state.players[${i}].zones.${zname}.cards[${c}]`, false, missed));
      }
    }
    // A3 / amendment P2: a library is a count PLUS the cards a continuous
    // "may look" static reveals -- never a stub, never completing the count.
    const lib = plainObject(zones.library) ? zones.library : null;
    if (lib !== null && lib.cards !== undefined) {
      if (!Array.isArray(lib.cards)) {
        out.push(`state.players[${i}].zones.library.cards is not an array`);
      } else {
        if (lib.cards.length > lib.count) {
          out.push(`state.players[${i}].zones.library.cards has ${lib.cards.length} entries but ` +
            `count=${lib.count} -- count is the FULL library size (A3)`);
        }
        for (let c = 0; c < lib.cards.length; c++) {
          const card = lib.cards[c];
          const where = `state.players[${i}].zones.library.cards[${c}]`;
          if (plainObject(card) && (card.hidden === true || card.faceDownHidden === true)) {
            out.push(`${where} is a redacted stub -- library.cards lists ONLY cards ` +
              `canBeShownTo(viewer) allows, so a stub there is a count in disguise (A3)`);
            continue;
          }
          out.push(...checkCard(card, where, false, missed));
        }
      }
    }
  }

  for (let i = 0; i < (body.stack ?? []).length; i++) {
    out.push(...checkShape(body.stack[i], STACK_ITEM_SHAPE, `state.stack[${i}]`, missed));
  }
  // Section 3.3: stackCards goes through the SAME redaction gate, so it gets
  // the same card check -- if it did not, it would be the second serialisation
  // path the design says must not exist.
  for (let i = 0; i < (body.stackCards ?? []).length; i++) {
    out.push(...checkCard(body.stackCards[i], `state.stackCards[${i}]`, true, missed));
  }
  if (plainObject(body.combat) && Array.isArray(body.combat.bands)) {
    for (let i = 0; i < body.combat.bands.length; i++) {
      out.push(...checkShape(body.combat.bands[i], COMBAT_BAND_SHAPE, `state.combat.bands[${i}]`));
    }
  }

  for (let i = 0; i < (body.events ?? []).length; i++) {
    const ev = body.events[i];
    const where = `state.events[${i}]`;
    if (!plainObject(ev) || !str(ev.kind)) {
      out.push(`${where} has no "kind"`);
      continue;
    }
    const shape = EVENT_SHAPES[ev.kind];
    if (shape === undefined) {
      out.push(`${where}.kind = ${JSON.stringify(ev.kind)} is not one of the ` +
        `${Object.keys(EVENT_SHAPES).length} kinds in docs/protocol.md section 3.6`);
      continue;
    }
    out.push(...checkShape(ev, { kind: str, ...shape }, `${where} (${ev.kind})`, missed));
  }

  return out;
}

/**
 * Does this frame-log line carry a `dir` key?  Cheap and textual on purpose: it
 * runs once, on line 1, only to decide whether a file is a client log.
 */
function hasDir(line) {
  return /"dir"\s*:/.test(line);
}

function checkFile(path, { preAmendment = false, opponentLibraryOk = false, clientLog = false } = {}) {
  const problems = [];
  const note = (line, msg) => problems.push(`${path}:${line}: ${msg}`);

  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { problems: [`${path}: empty file`], stats: {} };
  }

  // ---- line 0: the session header -------------------------------------
  let header;
  try {
    header = JSON.parse(lines[0]);
  } catch (e) {
    return { problems: [`${path}:1: line 0 is not JSON: ${e.message}`], stats: {} };
  }
  if (header.kind !== 'session') {
    note(1, `line 0 must be the session header ("kind":"session"), got kind=${JSON.stringify(header.kind)}`);
  }
  if (header.v !== PROTOCOL_VERSION) {
    note(1, `session header v=${header.v}, expected ${PROTOCOL_VERSION}`);
  }
  for (const k of ['gameId', 'startedAt', 'seat', 'decks']) {
    if (header[k] === undefined) note(1, `session header is missing "${k}"`);
  }
  /*
   * Section 8.1.  `transport` says which client produced this log, and it is
   * present only on a log a SEAT played (M2+): an AI-vs-AI recording has no
   * transport at all.  It exists because one of them answers every ask with a
   * literal null on purpose -- see A12 below, where it is the difference
   * between "the de-risking transport did its job" and "the bridge handed Forge
   * a null it dereferences".
   */
  const TRANSPORTS = ['null', 'auto', 'console', 'ws'];
  if (header.transport !== undefined && !TRANSPORTS.includes(header.transport)) {
    note(1, `session header transport=${JSON.stringify(header.transport)} is not one of ` +
      `${TRANSPORTS.join(' | ')} (section 8.1)`);
  }
  const nullTransport = header.transport === 'null';

  /*
   * Section 8.1, amendment M31.  Two OPTIONAL keys that say what shaped this
   * run beyond the seed: `policy` (only `"probe"` today -- AutoTransport's M5
   * policy, which takes four decisions the other way) and `prefs`, the Forge
   * preferences the process set in memory.  Tolerated, never required: every
   * recording made before M31 has neither, and a log without them is a log made
   * on defaults.  They are checked for SHAPE so that a typo is a failure rather
   * than a silently ignored key -- `fixtures/games/human-amount-7.jsonl` carries
   * two `confirm` asks that cannot occur on stock preferences, and `prefs` is
   * the only thing in the file that says why.
   */
  const POLICIES = ['probe'];
  if (header.policy !== undefined && !POLICIES.includes(header.policy)) {
    note(1, `session header policy=${JSON.stringify(header.policy)} is not one of ` +
      `${POLICIES.join(' | ')} (section 8.1, M31)`);
  }
  if (header.prefs !== undefined) {
    if (!Array.isArray(header.prefs) || !header.prefs.every((x) => str(x))) {
      note(1, `session header "prefs" must be an array of FPref names (section 8.1, M31), got ` +
        `${JSON.stringify(header.prefs)}`);
    }
  }

  if (!Array.isArray(header.decks)) {
    note(1, 'session header "decks" is not an array');
  } else {
    // Section 8.1/8.3: one entry per seat, but a deck path plus its sha256
    // identifies a decklist exactly, and 8.3 promises the log contains only
    // what THIS player was allowed to see. Only the viewing seat's entry names
    // a file.
    for (const d of header.decks) {
      if (!plainObject(d) || typeof d.player !== 'number') {
        note(1, `session header decks entry ${JSON.stringify(d)} has no player id`);
        continue;
      }
      if (d.player === header.seat) {
        if (!str(d.path)) note(1, `session header: the viewing seat's deck has no path`);
      } else if (d.path !== null || d.sha256 !== null) {
        note(1,
          `session header: deck entry for player ${d.player} carries ` +
            `path=${JSON.stringify(d.path)} sha256=${JSON.stringify(d.sha256)} -- ` +
            `that identifies an opponent's decklist, which this seat never saw (section 8.1)`);
      }
      if (typeof d.cards !== 'number') {
        note(1, `session header: deck entry for player ${d.player} has no "cards" count`);
      }
    }
  }

  // ---- every later line: an envelope + a body --------------------------
  const stats = {
    frames: 0, state: 0, other: 0, bytes: statSync(path).size,
    cardsChecked: 0, redacted: 0, faceDown: 0, stackCards: 0,
    viewerHandNamed: 0, opponentHandCards: 0, events: 0, shapeChecks: 0,
    texts: 0, textsConcealed: 0,
    libraryRevealed: 0, altBlocks: 0, tokens: 0, asks: 0, promptsScanned: 0,
    everRevealed: 0, answers: 0, answerKinds: new Set(), unanswered: 0,
    askShapeChecks: 0, notices: 0, overs: 0, nullDefaults: 0,
    stackItems: 0,
    maxTurn: 0,
    hellos: 0, matchChecked: 0,
  };
  const seq = { s2c: 0, c2s: 0 };
  let sawState = false;
  const seat = header.seat;

  /*
   * CLIENT LOG MODE (amendment M10, the reader's half).
   *
   * `tools/ws-auto-play.mjs --log` and `tools/ws-smoke.mjs --log` write the
   * frames a CLIENT received, and a client's view of the stream is legitimately
   * not contiguous:
   *
   *   - a `resync` or a reconnect re-delivers `hello_ok`, the last `state` and
   *     any outstanding `ask` VERBATIM -- same `seq`, same `t`, same body -- so
   *     the same line appears twice and the second one may carry a LOWER `seq`
   *     than the line before it;
   *   - every frame the server emitted while nobody was connected is missing,
   *     so the client's `seq` series has real forward gaps.
   *
   * Both are M10 working as designed, and holding a client log to the
   * server-side monotonic rule made `node tools/check-redaction.mjs
   * var/ws-auto-*.jsonl` -- a documented command -- fail every time with five
   * `gap or reorder` lines and every content assertion passing.  So: a
   * byte-identical repeat is treated as THE SAME FRAME (warned, and not audited
   * a second time -- otherwise it would also trip A12's "an askId is unique for
   * the life of the connection"), a forward gap is a warning, and anything else
   * -- a lower `seq` whose body is NOT a verbatim repeat -- is still a failure,
   * because that is a reorder and no amendment permits it.  Server-side logs
   * under `var/games/` keep the hard rule unchanged: the bridge writes every
   * frame it produced exactly once, in order, and a gap there IS a dropped
   * frame.
   */
  const isClientLog = clientLog || header.recordedBy === 'client'
    || (lines.length > 1 && !hasDir(lines[1]));
  /** "<dir>:<seq>" -> {line, at}: the raw text of that frame and where it was audited. */
  const seenLines = new Map();
  let redelivered = 0;

  /** Non-fatal: things worth saying out loud that are not failures. */
  const warnings = [];
  const warn = (line, msg) => warnings.push(`${path}:${line}: ${msg}`);
  /** Amendments this recording predates, collected from absent (known) keys. */
  const missed = new Set();
  /**
   * Opt-in, and nothing in the repo opts in (see the header).  When false, the
   * ABSENCE of a key an amendment added is a hard failure rather than a WARN --
   * otherwise an emitter that stopped writing `owner`, `token`, `alt` or
   * `library.cards` is indistinguishable from an old file, and check-all exits 0
   * on exactly the drift step 6 exists to catch.
   */
  missed.tolerant = preAmendment;
  /**
   * The M6 comfort keys this file does not carry (see `optional`).  Absence is
   * legitimate -- an AI-vs-AI recording has no seat to answer them and every
   * pre-M6 log predates them -- so this is reported, never failed.
   */
  missed.optional = new Set();
  /**
   * The M6 comfort keys this file DOES carry.  Together with `missed.optional`
   * it is the all-or-nothing rule: a file that has some of them and not others
   * is a broken emitter, not an old recording.
   */
  missed.optionalPresent = new Set();

  /**
   * A6 -- the temporal half.  An id joins this set the moment the viewer was
   * legitimately shown the card: in a public zone, in their own hand, in a
   * library's revealed slice, inside an `ask` body, or as `input.focusCard`.
   * A full card in someone ELSE's hidden zone whose id is not in here means the
   * bridge served a name the seat was never shown.
   */
  const everRevealed = new Set();
  /** id -> was the last serialisation of this id concealed?  (A7) */
  const wasConcealed = new Map();
  /** Was an `ask` outstanding when this frame was written?  (A7) */
  let pendingAsk = null;
  /**
   * A12.  `askId` -> what the `answer` that closes it must look like.  The kind
   * and the option count both come from the `ask` body, because section 5.2's
   * answer shape is per-kind and its indices are ask-local (section 5.1).
   */
  const openAsks = new Map();
  /** `askId` -> the line the answer arrived on, so a second one can say where. */
  const closedAsks = new Map();
  /** The most recent state's card->zone/owner map, for the ask-body check. */
  let lastZoneOf = new Map();

  /**
   * Everything that is not a `state` frame: `ask`, `input`, `notice`, `over`,
   * and the c2s lines.  M1 recordings contain none of the first three
   * (section 10.7) -- this exists so that the moment M2 starts emitting them,
   * the assertions are already running rather than being written afterwards.
   */
  /*
   * Section 2.1, amendment M44 -- `hello_ok.match`: each seat's deck by NAME,
   * the AI's profile, the match length.  OPTIONAL: every recording made before
   * 2026-09-27 lacks it and `mtgtable.RecordMatch` never writes it, so absence
   * is counted and never failed.  Present, it is held to EXACT key sets, and
   * `aiDeck` is the one that matters: `{name, cards}` and nothing else.  A
   * `path`, a `sha256` or a list there is the opponent's decklist handed to the
   * player in the first frame the client reads -- section 8.1's reason for
   * nulling the session header's entry for that seat, arriving by a second
   * channel (hard rule 8).  The values are then cross-checked against the
   * session header, which the bridge writes from the same two Deck objects: a
   * disagreement means one of the two emitters is describing a different match.
   */
  function auditHello(body, lineNo) {
    stats.hellos++;
    if (body.match === undefined) return;
    const m = body.match;
    const where = 'hello_ok.match (section 2.1, amendment M44)';
    if (!plainObject(m)) {
      note(lineNo, `${where} must be an object, got ${JSON.stringify(m)}`);
      return;
    }
    stats.matchChecked++;
    if (!sameKeys(m, ['yourDeck', 'aiDeck', 'aiProfile', 'games'])) {
      note(lineNo, `${where} has keys ${JSON.stringify(Object.keys(m))}, expected exactly ` +
        `yourDeck, aiDeck, aiProfile, games`);
    }
    const count = (v) => Number.isInteger(v) && v >= 0;
    const yd = m.yourDeck;
    if (!plainObject(yd) || !sameKeys(yd, ['name', 'path', 'cards']) || !str(yd.name) ||
        yd.name === '' || !str(yd.path) || yd.path === '' || !count(yd.cards)) {
      note(lineNo, `${where}: yourDeck must be exactly {name: non-empty string, path: string, ` +
        `cards: integer}, got ${JSON.stringify(yd)}`);
    }
    const ad = m.aiDeck;
    if (!plainObject(ad)) {
      note(lineNo, `${where}: aiDeck must be an object, got ${JSON.stringify(ad)}`);
    } else {
      const extra = Object.keys(ad).filter((k) => k !== 'name' && k !== 'cards');
      if (extra.length > 0) {
        note(lineNo, `${where}: aiDeck carries ${extra.map((k) => JSON.stringify(k)).join(', ')} -- ` +
          `the AI's deck is its NAME and card COUNT only. A path, a hash or a list identifies the ` +
          `opponent's decklist, which this seat never saw (hard rule 8, section 8.1)`);
      }
      if (!str(ad.name) || ad.name === '') note(lineNo, `${where}: aiDeck.name must be a non-empty string`);
      if (!count(ad.cards)) note(lineNo, `${where}: aiDeck.cards must be an integer, got ${JSON.stringify(ad.cards)}`);
    }
    // A profile is the base name of a `.ai` file: a word, never a path.
    if (!str(m.aiProfile) || !/^[A-Za-z0-9][A-Za-z0-9 _()-]*$/.test(m.aiProfile)) {
      note(lineNo, `${where}: aiProfile must be a Forge AI profile name, got ${JSON.stringify(m.aiProfile)}`);
    }
    if (!Number.isInteger(m.games) || m.games < 1) {
      note(lineNo, `${where}: games must be an integer >= 1, got ${JSON.stringify(m.games)}`);
    }
    // Amendment M41's `gameCount` is `--games` too, when it is present at all.
    if (body.gameCount !== undefined && body.gameCount !== m.games) {
      note(lineNo, `${where}: games=${JSON.stringify(m.games)} but gameCount=` +
        `${JSON.stringify(body.gameCount)} -- both are --games N`);
    }
    // The session header, when it has entries (a CLIENT log's is `decks: []`).
    if (Array.isArray(header.decks) && header.decks.length > 0) {
      const mine = header.decks.find((d) => plainObject(d) && d.player === header.seat);
      const theirs = header.decks.find((d) => plainObject(d) && d.player !== header.seat);
      if (mine !== undefined && plainObject(yd)) {
        if (mine.path !== yd.path) {
          note(lineNo, `${where}: yourDeck.path=${JSON.stringify(yd.path)} but the session header ` +
            `says ${JSON.stringify(mine.path)} for the viewing seat`);
        }
        if (typeof mine.cards === 'number' && mine.cards !== yd.cards) {
          note(lineNo, `${where}: yourDeck.cards=${yd.cards} but the session header says ${mine.cards}`);
        }
      }
      if (theirs !== undefined && plainObject(ad) && typeof theirs.cards === 'number' &&
          theirs.cards !== ad.cards) {
        note(lineNo, `${where}: aiDeck.cards=${ad.cards} but the session header says ${theirs.cards}`);
      }
    }
  }

  function auditNonStateFrame(f, lineNo) {
    const body = f.body;
    if (f.type === 'hello_ok') {
      auditHello(body, lineNo);
      return;
    }
    if (f.type === 'ask') {
      stats.asks++;
      // --- A11: the kind is one of the documented eleven -----------------
      if (!ASK_KINDS.has(body.kind)) {
        note(lineNo, `ask.kind=${JSON.stringify(body.kind)} is not one of the eleven kinds in ` +
          `docs/protocol.md section 5.1` +
          (body.kind === 'open_zones'
            ? ' -- open_zones was DELETED (report 06 section 3): openZones/tempShowZones carry no ' +
              'cards, run on the EDT, and are now the non-blocking input.openZones hint (A11)'
            : ' (A11)'));
      }
      pendingAsk = body.askId ?? true;

      // --- the drift half, per kind: exact key set + declared nullability ---
      const shape = ASK_SHAPES[body.kind];
      if (shape !== undefined) {
        stats.askShapeChecks++;
        for (const complaint of checkShape({ ...body }, { ...ASK_COMMON, ...shape }, `ask.${body.kind}`)) {
          note(lineNo, complaint);
        }
      }

      // --- A12: remember what a legal answer to THIS ask looks like ---------
      if (!str(body.askId) || body.askId === '') {
        note(lineNo, 'ask has no "askId" -- section 2.3 says exactly one answer per ask, ' +
          'which cannot be checked without one (A12)');
      } else if (openAsks.has(body.askId) || closedAsks.has(body.askId)) {
        note(lineNo, `ask reuses askId ${JSON.stringify(body.askId)}, which this log already ` +
          `opened -- section 5 says an askId is unique for the life of the connection (A12)`);
      } else {
        openAsks.set(body.askId, { kind: body.kind, count: optionCount(body), line: lineNo });
      }

      // Every card inside an ask body goes through the one gated function, so
      // it gets the same audit as a card in `state`.
      const inReveal = new Set();
      const reveal = body.delayedReveal;
      if (plainObject(reveal) && Array.isArray(reveal.cards)) {
        for (const c of reveal.cards) {
          if (num(c?.id)) inReveal.add(c.id);
        }
      }
      /*
       * A `choose_list` with `reveal: true` IS the reveal (§5.2, amendment A7).
       * Forge's `AbstractGuiGame.reveal(message, items)` is
       * `getChoices(message, -1, -1, items)` -- a negative `min` meaning *show
       * these, select nothing* -- and the emitter writes `reveal: min < 0`. Its
       * whole purpose is to put cards in front of this seat, so its own options
       * are its own delayed reveal and P12 below must not read them as a leak.
       * Measured: a game in which the seat looked at the AI's hand produced
       * `{"kind":"choose_list","prompt":"Looking at cards in Forge AI's hand",
       * "reveal":true,"options":[{"cardId":76,…}]}` and this checker called it a
       * leak -- while the card had gone through `Snap.card`'s
       * `canBeShownTo(viewer)` gate, i.e. Forge itself had said the seat may see
       * it.
       *
       * This widens nothing else: `reveal: true` is only emitted for
       * `getChoices` with `min < 0`, every card in the body still gets the full
       * per-card audit above, and a `choose_list` WITHOUT the flag is unchanged.
       */
      /*
       * ...and the assertion that makes the paragraph above self-policing (M6
       * verification finding 8). `reveal` is a flag the EMITTER writes, and the
       * relaxation below turns it into "stop auditing this ask's option cards
       * against P12". That is only sound while the flag means what
       * `WireGuiGame.getChoices` makes it mean -- `min < 0`, i.e. Forge's own
       * `AbstractGuiGame.reveal` channel, which is a `choose_list` and nothing
       * else. So: the flag on ANY other kind is a failure, whatever else the
       * file contains. Without this, an emitter regression that started writing
       * `reveal: true` on, say, a `manipulate_list` would silently switch P12
       * off for a kind it was never argued for.
       */
      if (body.reveal === true && body.kind !== 'choose_list') {
        note(lineNo, `ask.reveal is true on kind ${JSON.stringify(body.kind)}: \`reveal\` is `
          + 'Forge\'s getChoices(min < 0) channel and is only ever a `choose_list` (§5.2, '
          + 'amendment A7). On any other kind it would switch amendment P12\'s option-card '
          + 'audit off for a kind that was never argued for');
      }
      if (body.kind === 'choose_list' && body.reveal === true) {
        for (const { card } of askCards(body)) {
          if (num(card?.id) && card.hidden !== true) inReveal.add(card.id);
        }
      }
      for (const { card, where } of askCards(body)) {
        for (const complaint of checkCard(card, `ask.${where}`, false, missed)) note(lineNo, complaint);
        if (!num(card.id)) continue;
        // A6 source (b): an ask body is a legitimate reveal channel -- the game
        // thread is parked inside the call that made these cards visible.
        if (card.hidden !== true) everRevealed.add(card.id);

        // Amendment P12: a list-shaped ask must not carry more than the effect
        // reveals.  The concrete, checkable half: no card that the last snapshot
        // had in an opponent's hidden zone may appear in the option list unless
        // the delayed reveal is what put it there.
        if ((body.kind === 'manipulate_list' || body.kind === 'choose_list') &&
            card.hidden !== true && !inReveal.has(card.id)) {
          const known = lastZoneOf.get(card.id);
          if (known !== undefined && known.owner !== seat &&
              (known.zone === 'hand' || known.zone === 'library')) {
            note(lineNo, `ask ${body.kind} carries full card ${card.id} ` +
              `${JSON.stringify(card.name)}, which the last snapshot had in player ` +
              `${known.owner}'s ${known.zone} and which no delayedReveal covers -- an option ` +
              `list may only show what the effect reveals`);
          }
        }
      }
      // A10: the engine builds prompts out of CardView.toString(), which is
      // "<zone> <name> (<id>)" for ANY card in ANY zone.  We do not build them,
      // so this warns rather than fails until section 4's filtering exists.
      scanPrompt(body.prompt, `ask.prompt`, lineNo);
      /*
       * A10, the half that was missing until a human-seat recording existed to
       * show it: OPTION LABELS are engine strings too, and section 5 is explicit
       * that "every option label goes through the same gate -- the label is the
       * leak that will actually happen".  Measured in
       * fixtures/games/human-auto-42.jsonl, an `order` option's label is
       *
       *   "Thriving Isle (9) - Thriving Isle enters tapped."
       *
       * i.e. Forge's own `name (id)` join, in a string the client renders
       * verbatim.  That one is the viewer's own land and leaks nothing; the
       * point is that nothing was looking.  Same treatment as a prompt: a WARN
       * when the id belongs to a card this seat's last snapshot concealed.
       */
      for (const { label, where } of askLabels(body)) {
        scanPrompt(label, `ask.${where}`, lineNo);
      }
      return;
    }

    if (f.type === 'input') {
      scanPrompt(body.prompt, 'input.prompt', lineNo);
      // M6, amendment M39. `buttons.focus` says which button Space activates.
      // Three-valued and never a boolean: a client that read `true` as "OK" and
      // `false` as "Cancel" would press Cancel on every ordinary prompt.
      if (plainObject(body.buttons)) {
        if ('focus' in body.buttons) {
          missed.optionalPresent.add('input.buttons.focus');
          if (!nullable(oneOf('ok', 'cancel'))(body.buttons.focus)) {
            note(lineNo, `input.buttons.focus = ${JSON.stringify(body.buttons.focus)} is not ` +
              '"ok", "cancel" or null (section 4, amendment M39)');
          }
        } else {
          // Counted, not complained about, and then held to the all-or-nothing
          // rule with the rest of the comfort block below.
          missed.optional.add('input.buttons.focus');
        }
      }
      // Amendment P6: openZones is a HINT on input, never an ask.  It carries
      // zone names only -- a card in it would mean the hint grew a payload.
      if (body.openZones !== undefined) {
        if (!Array.isArray(body.openZones)) {
          note(lineNo, 'input.openZones is not an array');
        } else {
          for (const hint of body.openZones) {
            if (!plainObject(hint) || !num(hint.playerId) || !arrayOf(str)(hint.zones)) {
              note(lineNo, `input.openZones entry ${JSON.stringify(hint)} is not ` +
                `{playerId, zones:[string]} -- PlayerZoneUpdate carries nothing else`);
            }
          }
        }
      }
      // A6 source (e): setCard/setPanelSelection push cards that are often not
      // in the snapshot at all, which is why focusCard exists.
      if (plainObject(body.focusCard)) {
        for (const complaint of checkCard(body.focusCard, 'input.focusCard', false, missed)) {
          note(lineNo, complaint);
        }
        if (num(body.focusCard.id) && body.focusCard.hidden !== true) {
          everRevealed.add(body.focusCard.id);
        }
      }
      return;
    }

    if (f.type === 'notice') {
      stats.notices++;
      for (const complaint of checkShape(body, NOTICE_SHAPE, 'notice')) note(lineNo, complaint);
      /*
       * A10, promoted from WARN to FAIL for this one frame type.
       *
       * `ask.prompt` and `input.prompt` are Forge's strings and the bridge does
       * not build them, which is why naming a concealed card there is documented
       * residual risk (report 06 section 10, risk 3) and warns.  A `notice` is
       * different now: both of its strings pass through `Snap.sweepText` against
       * the ids the last snapshot concealed, so an id that reaches the wire here
       * is OUR gate failing, not Forge's phrasing.  That is a failure.
       */
      scanPrompt(body.title, 'notice.title', lineNo, note);
      scanPrompt(body.text, 'notice.text', lineNo, note);
      return;
    }

    if (f.type === 'over') {
      stats.overs++;
      for (const complaint of checkShape(body, OVER_SHAPE, 'over')) note(lineNo, complaint);
      return;
    }

    if (f.type === 'answer') {
      pendingAsk = null;
      auditAnswer(body, lineNo);
    }
  }

  /**
   * A12 -- the half of the ask path a log can actually prove.
   *
   * Section 2.3: exactly one `answer` per `ask`, addressing options by
   * ask-local index; section 5.2 gives the value shape per kind; section 5.4
   * names the three kinds that may never answer `null` because Forge
   * dereferences their result unguarded.  None of that was checked here at all
   * before -- an `answer` was an opaque body -- so `{"value":null}` for an
   * `order` read exactly like a legal cancel, and the first log with a human
   * seat in it would have been the place that got discovered.
   */
  function auditAnswer(body, lineNo) {
    stats.answers++;
    const askId = body.askId;
    if (!str(askId) || askId === '') {
      note(lineNo, 'answer has no "askId" -- section 2.3 keys an answer to its ask (A12)');
      return;
    }
    const open = openAsks.get(askId);
    if (open === undefined) {
      const closedAt = closedAsks.get(askId);
      note(lineNo, closedAt === undefined
        ? `answer for askId ${JSON.stringify(askId)}, which no ask in this log opened -- ` +
          `section 2.3: exactly one answer per ask (A12)`
        : `a SECOND answer for askId ${JSON.stringify(askId)} (the first was line ${closedAt}) -- ` +
          `section 2.3 drops it with a notice and never applies it, so a log carrying two is ` +
          `either a replayed frame or a ReplyPool that completed twice (A12)`);
      return;
    }
    openAsks.delete(askId);
    closedAsks.set(askId, lineNo);
    stats.answerKinds.add(open.kind);

    const spec = ANSWER_RULES[open.kind];
    if (spec === undefined) return;   // unknown kind: already failed under A11
    if (!('value' in body)) {
      note(lineNo, `answer for ${open.kind} ask ${JSON.stringify(askId)} has no "value" key -- ` +
        `it is always present, a null included (A12)`);
      return;
    }
    if (body.value === null) {
      if (spec.nullOk) return;
      /*
       * Invariant 6 has two halves and they are about different ends of the
       * wire: a CLIENT may answer null to any ask ("every ask must be
       * answerable with null"), and the BRIDGE must not hand Forge a null for
       * these two kinds -- it synthesises the default instead. A log can only
       * see the first half.
       *
       * For a real client a null here is still the finding it was written to
       * be: it says the player's answer was thrown away and the engine's
       * default played the turn. For `--transport null`, whose entire purpose
       * is to answer null to everything so the defaults get exercised, it is
       * the expected result, and the session header is what tells the two
       * apart. It stays visible as a warning either way.
       */
      const msg = `answer for the ${open.kind} ask ${JSON.stringify(askId)} (opened line ` +
        `${open.line}) is null. That kind has NO usable null default: docs/protocol.md ` +
        `section 5.4 and invariant 6 -- Forge dereferences the result unguarded, so the ` +
        `bridge must synthesise a default rather than complete the future with null (A12)`;
      if (nullTransport) {
        stats.nullDefaults++;
        warn(lineNo, `${msg} -- expected here: the session header says transport="null", ` +
          `whose whole job is to answer null and let the documented defaults play the game`);
      } else {
        note(lineNo, msg);
      }
      return;
    }
    const wanted = spec.rule(body.value, open.count);
    if (wanted !== null) {
      note(lineNo, `answer for the ${open.kind} ask ${JSON.stringify(askId)} (opened line ` +
        `${open.line}) is ${JSON.stringify(body.value)}; docs/protocol.md section 5.2 wants ` +
        `${wanted} (A12)`);
    }
  }

  /**
   * Every option LABEL an `ask` body carries, plus the two button labels of a
   * `confirm`.  Section 5: the client renders these verbatim and never parses
   * them, so whatever the bridge put in one is what the user reads.
   */
  function askLabels(body) {
    const out = [];
    const fromOptions = (list, where) => {
      if (!Array.isArray(list)) return;
      list.forEach((opt, i) => {
        if (plainObject(opt) && str(opt.label)) out.push({ label: opt.label, where: `${where}[${i}].label` });
      });
    };
    for (const key of ['options', 'targets', 'cards', 'main', 'side', 'source', 'dest']) {
      fromOptions(body[key], key);
    }
    for (const key of ['yesLabel', 'noLabel', 'destLabel', 'label', 'title']) {
      if (str(body[key])) out.push({ label: body[key], where: key });
    }
    if (Array.isArray(body.suggestions)) {
      body.suggestions.forEach((s, i) => {
        if (str(s)) out.push({ label: s, where: `suggestions[${i}]` });
      });
    }
    return out;
  }

  /** Every card object an `ask` body carries, wherever the kind puts them. */
  function askCards(body) {
    const out = [];
    const fromOptions = (list, where) => {
      if (!Array.isArray(list)) return;
      for (let i = 0; i < list.length; i++) {
        const opt = list[i];
        if (plainObject(opt?.card)) out.push({ card: opt.card, where: `${where}[${i}].card` });
      }
    };
    fromOptions(body.options, 'options');
    fromOptions(body.targets, 'targets');
    fromOptions(body.cards, 'cards');
    fromOptions(body.main, 'main');
    fromOptions(body.side, 'side');
    fromOptions(body.source, 'source');
    fromOptions(body.dest, 'dest');
    if (plainObject(body.card)) out.push({ card: body.card, where: 'card' });
    if (plainObject(body.attackerCard)) out.push({ card: body.attackerCard, where: 'attackerCard' });
    if (plainObject(body.delayedReveal) && Array.isArray(body.delayedReveal.cards)) {
      body.delayedReveal.cards.forEach((c, i) => {
        if (plainObject(c)) out.push({ card: c, where: `delayedReveal.cards[${i}]` });
      });
    }
    return out;
  }

  /**
   * A10.  `InputSelectTargets.showMessage` appends `sa.getHostCard().toString()`
   * and every chosen target's `toString()`, and `CardView.toString()` is
   * "<zoneText> <name> (<id>)" for a card in ANY zone -- including a library one.
   * Low frequency, high embarrassment; a warning until we filter prompts.
   */
  function scanPrompt(text, where, lineNo, report = warn) {
    if (!str(text) || text === '') return;
    stats.promptsScanned++;
    for (const m of text.matchAll(CARD_REF)) {
      const id = Number(m[1]);
      const known = lastZoneOf.get(id);
      if (known === undefined) continue;
      if (known.concealed || (known.owner !== seat && (known.zone === 'hand' || known.zone === 'library'))) {
        report(lineNo, `${where} names card #${id}, which the last snapshot concealed from ` +
          `seat ${seat}: ${JSON.stringify(text)} (A10 -- ` +
          (report === warn
            ? 'the engine builds this string, we do not)'
            : 'this one goes through Snap.sweepText, so it is OUR gate that failed)'));
      }
    }
  }

  /*
   * A6, THE ONE-FRAME LOOKAHEAD, and why it is exactly one frame.
   *
   * `WireGuiGame.ask()` is `flushState(List.of()); … emit("ask", …)` -- the
   * snapshot is deliberately pushed FIRST, because report 06 W4 says that is
   * the snapshot in which a temporarily revealed card is visible, and a client
   * rendering the ask must have a board that matches it. So when an effect
   * reveals an opponent's hand, the `state` that shows the card and the `ask`
   * that justifies it are the same instant, with the `state` written first.
   *
   * A6's temporal rule -- "a full card in someone else's hidden zone must have
   * been revealed EARLIER in this log" -- therefore fails that pair by one
   * frame. Measured: `{"kind":"choose_list","prompt":"Looking at cards in Forge
   * AI's hand","reveal":true,"options":[{"cardId":76,…}]}`, whose card the
   * preceding `state` showed in player 1's hand, produced three complaints on
   * a recording that was correct.
   *
   * So: an `ask` is allowed to justify the `state` IMMEDIATELY BEFORE IT, and
   * nothing further back. This map is built here, in a pre-pass, keyed by that
   * state's line: for each `ask`, walk backwards past c2s frames (an act or an
   * answer may interleave in a client log) to the nearest preceding s2c frame,
   * and if that frame is a `state`, its line gets the ask's card ids. One ask,
   * one state, one frame of slack. An id revealed by an ask two frames later is
   * still a failure, which is the property the rule is for.
   */
  const preAskReveals = new Map();
  {
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        parsed.push({ line: i + 1, f: JSON.parse(lines[i]) });
      } catch {
        parsed.push({ line: i + 1, f: null });
      }
    }
    for (let k = 0; k < parsed.length; k++) {
      const { f } = parsed[k];
      if (f === null || f.type !== 'ask' || !plainObject(f.body)) continue;
      let j = k - 1;
      while (j >= 0 && parsed[j].f !== null && parsed[j].f.dir === 'c2s') j--;
      if (j < 0 || parsed[j].f === null || parsed[j].f.type !== 'state') continue;
      const ids = preAskReveals.get(parsed[j].line) ?? new Set();
      for (const { card } of askCards(f.body)) {
        if (num(card?.id) && card.hidden !== true) ids.add(card.id);
      }
      if (ids.size > 0) preAskReveals.set(parsed[j].line, ids);
    }
  }
  /** Was `id` revealed by this frame, or by the `ask` this frame was flushed for? */
  const revealedBy = (id, lineNo) =>
    everRevealed.has(id) || (preAskReveals.get(lineNo)?.has(id) ?? false);

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    let f;
    try {
      f = JSON.parse(lines[i]);
    } catch (e) {
      note(lineNo, `not JSON: ${e.message}`);
      continue;
    }
    if (f.kind === 'session') {
      note(lineNo, 'a second session header -- the header is line 0 only');
      continue;
    }
    stats.frames++;

    // envelope
    if (f.v !== PROTOCOL_VERSION) note(lineNo, `v=${f.v}, expected ${PROTOCOL_VERSION}`);
    if (typeof f.seq !== 'number') note(lineNo, `seq is ${typeof f.seq}, expected a number`);
    if (typeof f.t !== 'number') note(lineNo, `t is ${typeof f.t}, expected epoch ms`);
    if (f.dir !== 's2c' && f.dir !== 'c2s' && !(isClientLog && f.dir === undefined)) {
      note(lineNo, `dir=${JSON.stringify(f.dir)}, expected "s2c" or "c2s"`);
    }
    if (typeof f.type !== 'string' || f.type.length === 0) note(lineNo, 'type is missing');
    if (f.body === null || typeof f.body !== 'object' || Array.isArray(f.body)) {
      note(lineNo, 'body must be an object');
      continue;
    }
    const dir = f.dir ?? 's2c';
    if ((dir === 's2c' || dir === 'c2s') && !isClientLog) {
      const expected = seq[dir] + 1;
      if (f.seq !== expected) note(lineNo, `seq=${f.seq} for dir=${dir}, expected ${expected} (gap or reorder)`);
      seq[dir] = f.seq;
    } else if (dir === 's2c' || dir === 'c2s') {
      /*
       * A CLIENT log's seq series is not contiguous and is not even monotonic,
       * and both are M10 by design: `resend` hands a reconnecting client the
       * CACHED `hello_ok` / `state` / outstanding `ask` (born earlier, so lower
       * seq) interleaved with the freshly emitted `input` (higher), and every
       * frame emitted while nobody was connected is simply absent.  What is
       * still checkable, and is checked here, is that ONE seq means ONE frame:
       * a seq re-used for a DIFFERENT body is a real defect in either direction.
       */
      const key = `${dir}:${f.seq}`;
      const prior = seenLines.get(key);
      if (prior !== undefined) {
        if (prior.line === lines[i]) {
          redelivered++;
          stats.frames--;
          warn(lineNo, `frame ${f.type} seq=${f.seq} re-delivered verbatim (amendment M10: a `
            + `resync or a reconnect re-sends hello_ok / the last state / an outstanding ask `
            + `with the seq and t they were born with) -- audited once, on line ${prior.at}`);
          continue;                          // the same frame; auditing it twice trips A12
        }
        note(lineNo, `seq=${f.seq} for dir=${dir} was already used on line ${prior.at} by a `
          + `DIFFERENT frame -- section 1 numbers one frame per seq for the life of the `
          + `session, and M10 permits a REPEAT, not a re-use`);
      } else {
        seenLines.set(key, { line: lines[i], at: lineNo });
        const expected = seq[dir] + 1;
        if (f.seq !== expected) {
          warn(lineNo, `seq=${f.seq} for dir=${dir}, expected ${expected} -- a CLIENT log's `
            + `series is neither contiguous (the frames it was not connected for are missing) `
            + `nor monotonic (a resync re-delivers cached frames after newer ones); amendment `
            + `M10. In a server-side var/games/ log the same shape IS a dropped frame`);
        }
        if (f.seq > seq[dir]) seq[dir] = f.seq;
      }
    }

    if (f.type !== 'state') {
      stats.other++;
      auditNonStateFrame(f, lineNo);
      continue;
    }
    stats.state++;
    sawState = true;
    if (typeof f.body?.turn === 'number' && f.body.turn > stats.maxTurn) stats.maxTurn = f.body.turn;

    const body = f.body;
    const players = body.players;
    if (!Array.isArray(players)) {
      note(lineNo, 'state.players is not an array');
      continue;
    }
    if (Array.isArray(body.events)) stats.events += body.events.length;
    if (Array.isArray(body.stackCards)) stats.stackCards += body.stackCards.length;
    // How many stack ITEMS were shape-checked (not stackCards): the summary's
    // "yieldKey asserted opaque" claim is only true if this is non-zero, and a
    // file whose stack was empty in every frame never checked one.
    if (Array.isArray(body.stack)) stats.stackItems += body.stack.length;

    // --- the drift half: exact key sets and runtime types (section 3) ---
    stats.shapeChecks++;
    for (const complaint of checkStateShape(body, missed)) note(lineNo, complaint);

    // --- the text half: no engine string names a card this frame concealed ---
    for (const complaint of checkTexts(body, seat)) note(lineNo, complaint);
    for (const item of body.stack ?? []) {
      if (str(item?.text)) {
        stats.texts++;
        if (item.text === '') stats.textsConcealed++;
      }
    }
    for (const ev of body.events ?? []) {
      if (plainObject(ev) && ev.kind === 'cast' && str(ev.text)) {
        stats.texts++;
        if (ev.text === '') stats.textsConcealed++;
      }
    }

    // --- stackCards goes through the same gate, so it gets the same audit ---
    for (const c of body.stackCards ?? []) {
      stats.cardsChecked++;
      if (c.hidden === true) stats.redacted++;
      if (c.faceDownHidden === true) stats.faceDown++;
    }

    for (let pi = 0; pi < players.length; pi++) {
      const p = players[pi];
      const zones = p.zones || {};
      const isViewer = (p.id === seat) || (seat === undefined && pi === 0);

      // --- A3: a library is a count, PLUS whatever a continuous "may look"
      //     static reveals (amendment P2).  The shape half is in
      //     checkStateShape; this is the census and the "it exists" signal.
      const lib = zones.library;
      if (!lib) {
        note(lineNo, `players[${pi}].zones.library is missing`);
      } else {
        if (typeof lib.count !== 'number') {
          note(lineNo, `players[${pi}].zones.library.count is not a number`);
        }
        if (Array.isArray(lib.cards)) {
          stats.libraryRevealed += lib.cards.length;
          // An opponent's library IS the largest hidden-information surface in
          // the game. The shape is legitimately reachable -- Opposition Agent,
          // Bribery, Gonti -- but "reachable by three cards nobody in this repo
          // owns" is not a reason to default to a warning nobody reads. It
          // FAILS, and a recording that really does exercise one of those
          // effects says so on the command line.
          if (!isViewer && lib.cards.length > 0) {
            const msg =
              `players[${pi}] (id ${p.id}, NOT the viewing seat ${seat}) has ` +
              `${lib.cards.length} full card(s) in library.cards. Legal ONLY while a ` +
              `canBeShownTo-true effect is running on THEIR library (Opposition Agent, ` +
              `Bribery, Gonti); anything else is the largest possible leak. Pass ` +
              `--opponent-library-ok if this recording really exercises one (A3)`;
            if (opponentLibraryOk) warn(lineNo, msg);
            else note(lineNo, msg);
          }
          for (const c of lib.cards) {
            stats.cardsChecked++;
            // A6 source (d): a card in the VIEWER'S OWN library.cards was shown
            // to this seat, permanently -- a continuous MayLookAt static is a
            // standing permission. An opponent-library reveal is always
            // transient (it ends when the search does), so it must NOT confer a
            // name-before-reveal exemption for the rest of the log.
            if (num(c?.id) && isViewer) everRevealed.add(c.id);
          }
        } else if (lib.cards === undefined) {
          if (missed.tolerant) {
            missed.add('P2 (library.cards)');
          } else {
            note(lineNo, `players[${pi}].zones.library has no "cards" array -- amendment P2 ` +
              `made a library {count, cards} (docs/protocol.md section 3.4). An empty array ` +
              `is the ordinary case; an absent key is a pre-P2 emitter (A3)`);
          }
        }
      }

      for (const [zname, z] of Object.entries(zones)) {
        if (zname === 'library') continue;
        if (!z || !Array.isArray(z.cards)) {
          note(lineNo, `players[${pi}].zones.${zname}.cards is not an array`);
          continue;
        }
        if (z.count !== z.cards.length) {
          note(lineNo, `players[${pi}].zones.${zname}.count=${z.count} but cards.length=${z.cards.length}`);
        }
        for (const c of z.cards) {
          stats.cardsChecked++;
          const concealed = c.hidden === true || c.faceDownHidden === true;
          const owner = num(c.owner) ? c.owner : c.controller;

          if (c.faceDownHidden === true) {
            stats.faceDown++;
            // The superseded gate-2 shape: public state, no identity.  The exact
            // key set is asserted by checkCard above; this is the leak statement
            // said out loud, because it is the one that matters.
            for (const k of ['name', 'setCode', 'manaCost', 'types', 'owner', 'abilities',
                             'attachedToId', 'attachmentIds', 'loyalty', 'sick']) {
              if (k in c) {
                note(lineNo, `face-down card ${c.id} leaks "${k}" -- a face-down permanent's `
                  + `identity is not public`);
              }
            }
          }

          // --- A9: the face-down gate, in the amended spelling -------------
          if (c.faceDown === true && c.hidden !== true) {
            stats.faceDown++;
            if (c.name !== '' && c.name !== null && c.name !== undefined) {
              note(lineNo, `face-down card ${c.id} carries name ${JSON.stringify(c.name)} -- ` +
                `Forge's face-down state has no name, so this came from getAlternateState() (A9)`);
            }
            if (c.alt !== null && c.alt !== undefined) {
              stats.altBlocks++;
              if (owner !== seat && c.controller !== seat) {
                note(lineNo, `face-down card ${c.id} is controlled by player ${c.controller} ` +
                  `(owner ${owner}), not the viewing seat ${seat}, yet carries an "alt" block ` +
                  `naming it ${JSON.stringify(c.alt?.name)} -- canFaceDownBeShownTo ends ` +
                  `isInZone(Battlefield, Stack, Sideboard) && getController().equals(viewer) (A9)`);
              }
            }
            if (zname !== 'battlefield' && zname !== 'stack') {
              // Report 06 section 1.4: CardStateView.getType() is CardType.EMPTY
              // outside play, and the 2/2 is an artifact of the state object.
              // P/T go to null; `types` goes to "" -- the protocol's one
              // spelling of "no type line", so no renderer branches on absence.
              for (const k of ['power', 'toughness']) {
                if (c[k] !== null && c[k] !== undefined) {
                  note(lineNo, `face-down card ${c.id} in ${zname} carries ${k}=` +
                    `${JSON.stringify(c[k])} -- suppressed outside battlefield/stack (A9)`);
                }
              }
              if (c.types !== '' && c.types !== undefined) {
                note(lineNo, `face-down card ${c.id} in ${zname} carries types=` +
                  `${JSON.stringify(c.types)} -- a face-down card outside play has no public ` +
                  `body, so types is "" (A9)`);
              }
            }
          }
          if (c.token === true) stats.tokens++;

          if (c.hidden === true) {
            stats.redacted++;
            // A1: a redacted card carries FIVE keys and nothing else.  An absent
            // `owner` is the pre-amendment spelling and is counted, not failed.
            const extra = Object.keys(c).filter((k) => !REDACTED_KEYS.includes(k));
            if (extra.length) {
              note(lineNo, `redacted card ${c.id} leaks extra keys: ${extra.join(', ')} (A1)`);
            }
            for (const k of REDACTED_KEYS) {
              if (!(k in c)) {
                if (k === 'owner' && missed.tolerant) {
                  missed.add('P1 (owner on the redacted stub)');
                } else if (k === 'owner') {
                  note(lineNo, `redacted card ${c.id} is missing "owner" -- amendment P1 made ` +
                    `the stub five keys, because canBeShownTo's case Hand compares CONTROLLERS ` +
                    `while the zone arrays are keyed by the zone's player (A1)`);
                } else {
                  note(lineNo, `redacted card ${c.id} is missing "${k}" (A1)`);
                }
              }
            }
          }

          // --- A6 / A7: what this seat was shown, and when -----------------
          const hiddenZone = zname === 'hand';
          if (!concealed) {
            if (hiddenZone && !isViewer) {
              if (!revealedBy(c.id, lineNo)) {
                note(lineNo, `players[${pi}] (not the viewing seat) has a FULL card ${c.id} ` +
                  `${JSON.stringify(c.name)} in their ${zname}, and nothing earlier in this log ` +
                  `ever revealed that id to seat ${seat} -- either a reveal is missing from the ` +
                  `stream or the gate did not run (A6)`);
              } else if (wasConcealed.get(c.id) === true && pendingAsk === null) {
                warn(lineNo, `card ${c.id} went hidden -> full in player ${p.id}'s ${zname} with ` +
                  `no ask outstanding. Legal for a continuous MayLookAt static (Future Sight, ` +
                  `Bolas's Citadel) or a mind-slave/Opposition Agent search; suspicious otherwise (A7)`);
              }
            }
            // Reveal sources (a) public zones and (c) the seat's own hand.
            if (PUBLIC_ZONES.includes(zname) || (zname === 'exile' && c.faceDown !== true) ||
                (isViewer && zname === 'hand')) {
              everRevealed.add(c.id);
            }
          }
          wasConcealed.set(c.id, concealed);
          lastZoneOf.set(c.id, { zone: zname, owner: p.id, concealed });
        }
      }

      // --- A4: the opponent's hand is never named ---
      if (!isViewer && Array.isArray(zones.hand?.cards)) {
        for (const c of zones.hand.cards) {
          stats.opponentHandCards++;
          if ('name' in c && !revealedBy(c.id, lineNo)) {
            note(lineNo, `players[${pi}] (the opponent) hand card ${c.id} carries a name: ${JSON.stringify(c.name)}`);
          }
          if (c.hidden !== true && !revealedBy(c.id, lineNo)) {
            note(lineNo, `players[${pi}] (the opponent) hand card ${c.id} is not marked hidden`);
          }
        }
      }

      // --- the viewer's own hand IS named (otherwise we have proved nothing) ---
      if (isViewer && Array.isArray(zones.hand?.cards)) {
        for (const c of zones.hand.cards) {
          if (typeof c.name === 'string' && c.name.length > 0) {
            stats.viewerHandNamed++;
          } else if (c.faceDown === true || c.faceDownHidden === true) {
            // A face-down card in hand (a foretold/manifest oddity) has no name
            // by construction; that is Forge's face-down state, not redaction.
            stats.viewerHandNamed++;
          } else {
            note(lineNo, `the viewer's own hand card ${c.id} has no name -- redaction is too aggressive`);
          }
        }
      }
    }

    // --- A5: events carry ids only -- no identity-bearing key under them ---
    if (Array.isArray(body.events)) {
      for (const key of NAME_BEARING_KEYS) {
        const bad = findKey(body.events, key);
        if (bad) {
          note(lineNo, `state.events contains a "${key}" key at ${bad} -- events are ids only, ` +
            `and targetDescription/stackDescription/outcomeStrings/matchSummary are banned ` +
            `outright (A5, report 06 section 4)`);
        }
      }
    }
  }

  if (!sawState) note(lines.length, 'no state frames at all');

  // A12, the other half of "exactly one answer per ask". An ask still open at
  // EOF is a WARN, not a failure: a log truncated by a kill, or one whose game
  // ended while the thread was parked, legitimately ends mid-question. What it
  // must never be is invisible -- an ask nobody answered is the shape of a
  // wedged game thread (section 5.4).
  stats.unanswered = openAsks.size;
  for (const [askId, open] of openAsks) {
    warn(lines.length, `ask ${JSON.stringify(askId)} (${open.kind}, line ${open.line}) is never ` +
      `answered in this log. Every ask blocks the game thread until an answer arrives, so an ` +
      `unanswered one is either a truncated recording or a wedge (A12)`);
  }
  // "every state frame has a session header before it" -- the header is line 0,
  // so this is the same statement as: the first line is the header and no state
  // frame precedes it.  Both are checked above.

  // The two "this file proves nothing" assertions.  They are not leak checks --
  // they are the guard against a green run over a recording with no hidden
  // information in it at all -- so on a session that never dealt a card they are
  // a WARNING, not a failure.  `turn: 0` in every state is exactly that session:
  // the documented console smoke (`printf "\n\n\n\nq\n" | ... --transport
  // console`) concedes during the pre-game prompts, and before this the repo's
  // own documented command produced an artifact the repo's own gate rejected.
  // A file that reached turn 1 has had a card dealt, and both stay failures.
  const preGameOnly = stats.state > 0 && stats.maxTurn === 0;
  const provesNothing = (msg) => {
    if (preGameOnly) {
      warn(lines.length, `${msg}. Every \`state\` in this file is turn 0, so no card was ever ` +
        `dealt: this is a pre-game session (a concede during the opening prompts), and the ` +
        `assertion is a WARN rather than a failure because there was nothing to conceal`);
    } else {
      problems.push(`${path}: ${msg}`);
    }
  };
  if (stats.redacted === 0) {
    provesNothing('not one card was redacted -- either the opponent never held a card, or canBeShownTo is not being consulted');
  }
  if (stats.viewerHandNamed === 0) {
    provesNothing('the viewer never saw a named card in their own hand -- the test proves nothing');
  }
  stats.everRevealed = everRevealed.size;
  stats.missed = [...missed].sort();
  stats.optionalAbsent = [...missed.optional].sort();
  stats.optionalPresent = [...missed.optionalPresent].sort();
  /*
   * The all-or-nothing rule (see `optional`).  An OLD recording carries none of
   * M6's comfort keys; a BROKEN emitter carries some.  Only the second is a
   * failure, and before this existed neither was -- `optional()` made every one
   * of them absent-is-fine in every file, so the only thing in the repo that
   * required a seat recording to carry them was one assertion in
   * tools/ten-games.sh.
   */
  if (stats.optionalPresent.length > 0 && stats.optionalAbsent.length > 0) {
    const both = stats.optionalAbsent.filter((k) => missed.optionalPresent.has(k));
    const never = stats.optionalAbsent.filter((k) => !missed.optionalPresent.has(k));
    problems.push(
      `${path}: M6's comfort block is HALF PRESENT. This file carries ` +
      `${stats.optionalPresent.join(', ')}` +
      (never.length > 0 ? ` but never ${never.join(', ')}` : '') +
      (both.length > 0
        ? `${never.length > 0 ? ', and' : ' but'} writes ${both.join(', ')} in some frames ` +
          `and not others`
        : '') +
      `. A recording older than M6 has NONE of them and is fine; an emitter that ` +
      `stopped writing one of them looks exactly like this (protocol section 3, ` +
      `amendments M32-M36 and M39).`);
  }
  stats.clientLog = isClientLog;
  stats.redelivered = redelivered;

  return { problems, warnings, stats };
}

/** Depth-first search for a key name; returns a JSON-ish path or null. */
function findKey(node, key, path = 'events') {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const r = findKey(node[i], key, `${path}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === key) return `${path}.${k}`;
      const r = findKey(v, key, `${path}.${k}`);
      if (r) return r;
    }
  }
  return null;
}

// ----------------------------------------------------------------------

const argv = process.argv.slice(2);
/**
 * The ONE way to get the pre-amendment tolerance (see the header).  It is a
 * global, deliberately: a per-path allowance would quietly become the way new
 * files land, which is how the tolerance became invisible the first time.
 */
const preAmendment = argv.includes('--pre-amendment');
/**
 * The ONE way to accept a recording in which a seat other than the viewer has
 * full cards in `library.cards` (A3).  Like `--pre-amendment` it is global and
 * opt-in, and nothing in check-all.sh passes it: an opponent's library is the
 * largest hidden-information surface there is, so the recording that opens one
 * has to say so out loud.
 */
const opponentLibraryOk = argv.includes('--opponent-library-ok');
/**
 * Force client-log mode (amendment M10, the reader's half -- see `isClientLog`).
 * It is auto-detected from `recordedBy:"client"` in the session header, or from
 * a file whose frames carry no `dir` key at all; this flag is for a client log
 * that predates that header key.  It relaxes the seq rule and NOTHING else --
 * every content assertion (redaction, shapes, labels, prompts) is unchanged.
 */
const clientLog = argv.includes('--client-log');
const FLAGS = ['--pre-amendment', '--opponent-library-ok', '--client-log'];
const files = argv.filter((a) => !a.startsWith('--'));
const unknownFlag = argv.find((a) => a.startsWith('--') && !FLAGS.includes(a));
if (unknownFlag !== undefined) {
  console.error(`unknown flag ${unknownFlag}`);
  process.exit(2);
}
if (files.length === 0) {
  console.error('usage: node tools/check-redaction.mjs [--pre-amendment] ' +
    '[--opponent-library-ok] [--client-log] <frames.jsonl> [...]');
  console.error('  --pre-amendment       accept a log recorded before the 2026-09-11 amendments');
  console.error('                        (a four-key stub, a library with no `cards`, a card with');
  console.error('                        no `token`/`alt`, a `faceDownHidden` object) as a WARN.');
  console.error('  --opponent-library-ok accept full cards in a NON-viewer library.cards as a');
  console.error('                        WARN -- for a recording that really exercises a');
  console.error('                        look-at-an-opponent\'s-library effect (Opposition Agent,');
  console.error('                        Bribery, Gonti). It relaxes A3 and nothing else.');
  console.error('  --client-log          the file is a CLIENT\'s view of the stream (what');
  console.error('                        tools/ws-auto-play.mjs --log writes), so a verbatim');
  console.error('                        re-delivery and a forward gap are amendment M10, not');
  console.error('                        a dropped frame. Auto-detected from the header\'s');
  console.error('                        recordedBy:"client". It relaxes the seq rule alone.');
  process.exit(2);
}
if (preAmendment) {
  console.log('--pre-amendment: missing P1/P2/P3/P15 keys are WARNings, not failures');
}
if (opponentLibraryOk) {
  console.log('--opponent-library-ok: a non-viewer library.cards with content is a WARN, not a failure');
}

let failed = 0;
for (const path of files) {
  const { problems, warnings = [], stats } = checkFile(path, { preAmendment, opponentLibraryOk, clientLog });
  const ok = problems.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${path}`);
  console.log(`      frames=${stats.frames} (state=${stats.state}, other=${stats.other})`
    + `  bytes=${stats.bytes}  events=${stats.events}`
    + (stats.clientLog
      ? `  [CLIENT log: ${stats.redelivered} frame(s) re-delivered verbatim, M10]`
      : ''));
  console.log(`      cards checked=${stats.cardsChecked}  redacted=${stats.redacted}`
    + `  face-down=${stats.faceDown}  stack cards=${stats.stackCards}`
    + `  opponent-hand cards=${stats.opponentHandCards}  viewer-hand named=${stats.viewerHandNamed}`);
  console.log(`      shape-checked state bodies=${stats.shapeChecks} `
    + `(exact key set + runtime type of every key, docs/protocol.md section 3)`);
  console.log(`      engine strings=${stats.texts} (stack[].text + events[].cast.text), `
    + `concealed=${stats.textsConcealed}, none joinable to a card concealed in the same frame`);
  console.log(`      A6 ever-revealed ids=${stats.everRevealed}  library cards revealed=`
    + `${stats.libraryRevealed}  alt blocks=${stats.altBlocks}  tokens=${stats.tokens}  `
    + `asks=${stats.asks}  prompts scanned=${stats.promptsScanned}`);
  console.log(`      A12 answers=${stats.answers} (kinds: `
    + `${[...(stats.answerKinds ?? [])].sort().join(', ') || 'none'}), value shape checked against `
    + `the matching ask.kind, unanswered asks=${stats.unanswered}`
    + `${stats.nullDefaults ? `, ${stats.nullDefaults} answered null on purpose (transport="null")` : ''}`);
  console.log(`      shape-checked ask bodies=${stats.askShapeChecks} (exact key set + declared `
    + `nullability, section 5.2)  notices=${stats.notices} (both strings swept and scanned, `
    + `section 6)  over frames=${stats.overs}`);
  // M44.  Printed either way, like the M6 line below: which files evidence the
  // match block, and which predate it (or are AI vs AI, which never carry it).
  if (stats.hellos > 0) {
    console.log(stats.matchChecked > 0
      ? `      hello_ok.match checked on ${stats.matchChecked} of ${stats.hellos} hello_ok frame(s) `
        + `(exact key sets; aiDeck held to {name, cards}; cross-checked against the session header)`
      : `      hello_ok.match absent from ${stats.hellos} hello_ok frame(s) (legitimate -- recorded `
        + `before amendment M44, or AI vs AI; section 2.1)`);
  }
  // M6.  Which comfort fields this recording carries, and which it does not:
  // an AI-vs-AI log has no seat to answer them and a pre-M6 log predates them,
  // and both are protocol (amendments M32-M36).  Printed either way so the
  // corpus says out loud which half of it evidences the M6 wire.
  if ((stats.optionalAbsent ?? []).length > 0) {
    console.log(`      M6 comfort fields absent: ${stats.optionalAbsent.join(', ')} `
      + `(legitimate -- no seat, or recorded before M6; protocol section 3.1)`);
  } else if (stats.shapeChecks > 0) {
    // The stack half of the claim is only true if a stack item was actually
    // shape-checked: a file whose stack was empty in every frame never looked at
    // a `yieldKey`, and the earlier version of this line said it had anyway.
    console.log('      M6 comfort fields present: phaseStops{own,opp}, yield, undo, '
      + 'input.buttons.focus'
      + (stats.stackItems > 0
        ? `, stack[].yieldKey/isAbility/isOptionalTrigger/yielded over ${stats.stackItems} `
          + 'stack item(s) (yieldKey asserted opaque)'
        : ' — no stack item in any frame, so stack[].yieldKey was never checked here'));
  }
  if ((stats.missed ?? []).length > 0) {
    // Not a failure: the file is simply older than the amendment. It is printed
    // every run so a corpus cannot quietly stay on a superseded shape.
    console.log(`      WARN  --pre-amendment: recorded before ${stats.missed.join(', ')} -- `
      + `re-record it, this file cannot evidence `
      + `${stats.missed.length === 1 ? 'that amendment' : 'those amendments'}`);
  }
  for (const w of warnings.slice(0, 10)) console.log(`      ~ ${w}`);
  if (warnings.length > 10) console.log(`      ~ ... and ${warnings.length - 10} more warnings`);
  for (const p of problems.slice(0, 20)) console.log(`      ! ${p}`);
  if (problems.length > 20) console.log(`      ! ... and ${problems.length - 20} more`);
}
process.exit(failed === 0 ? 0 : 1);
