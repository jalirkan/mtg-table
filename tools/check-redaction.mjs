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
 *   A7  a hidden -> full transition with no `ask` behind it is WARNED about:
 *       continuous "may look" statics and mind-slave effects do that legally.
 *   A9  a face-down card names nothing unless this seat may flip it, and has no
 *       P/T outside the battlefield and the stack.
 *   A10 an id in parentheses inside an engine-built prompt is warned about
 *       unless that id was revealed (the engine builds those strings, not us).
 *   A11 every `ask.kind` is one of the ELEVEN documented kinds, and none of
 *       them is `open_zones` -- deleted, because opening a floating zone panel
 *       is not a question (report 06 section 3).
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

const STACK_ITEM_SHAPE = {
  id: num,
  // A stack item is never dropped, so these two are nullable by design
  // (section 3.1) -- unlike every id in an event.
  sourceCardId: nullable(num),
  controller: nullable(num),
  text: str,
  targetCardIds: arrayOf(num),
  targetPlayerIds: arrayOf(num),
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

function checkFile(path, preAmendment = false) {
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
    everRevealed: 0,
  };
  const seq = { s2c: 0, c2s: 0 };
  let sawState = false;
  const seat = header.seat;

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
  /** The most recent state's card->zone/owner map, for the ask-body check. */
  let lastZoneOf = new Map();

  /**
   * Everything that is not a `state` frame: `ask`, `input`, `notice`, `over`,
   * and the c2s lines.  M1 recordings contain none of the first three
   * (section 10.7) -- this exists so that the moment M2 starts emitting them,
   * the assertions are already running rather than being written afterwards.
   */
  function auditNonStateFrame(f, lineNo) {
    const body = f.body;
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

      // Every card inside an ask body goes through the one gated function, so
      // it gets the same audit as a card in `state`.
      const inReveal = new Set();
      const reveal = body.delayedReveal;
      if (plainObject(reveal) && Array.isArray(reveal.cards)) {
        for (const c of reveal.cards) {
          if (num(c?.id)) inReveal.add(c.id);
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
      return;
    }

    if (f.type === 'input') {
      scanPrompt(body.prompt, 'input.prompt', lineNo);
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

    if (f.type === 'answer') pendingAsk = null;
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
  function scanPrompt(text, where, lineNo) {
    if (!str(text) || text === '') return;
    stats.promptsScanned++;
    for (const m of text.matchAll(CARD_REF)) {
      const id = Number(m[1]);
      const known = lastZoneOf.get(id);
      if (known === undefined) continue;
      if (known.concealed || (known.owner !== seat && (known.zone === 'hand' || known.zone === 'library'))) {
        warn(lineNo, `${where} names card #${id}, which the last snapshot concealed from ` +
          `seat ${seat}: ${JSON.stringify(text)} (A10 -- the engine builds this string, we do not)`);
      }
    }
  }

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
    if (f.dir !== 's2c' && f.dir !== 'c2s') note(lineNo, `dir=${JSON.stringify(f.dir)}, expected "s2c" or "c2s"`);
    if (typeof f.type !== 'string' || f.type.length === 0) note(lineNo, 'type is missing');
    if (f.body === null || typeof f.body !== 'object' || Array.isArray(f.body)) {
      note(lineNo, 'body must be an object');
      continue;
    }
    if (f.dir === 's2c' || f.dir === 'c2s') {
      const expected = seq[f.dir] + 1;
      if (f.seq !== expected) note(lineNo, `seq=${f.seq} for dir=${f.dir}, expected ${expected} (gap or reorder)`);
      seq[f.dir] = f.seq;
    }

    if (f.type !== 'state') {
      stats.other++;
      auditNonStateFrame(f, lineNo);
      continue;
    }
    stats.state++;
    sawState = true;

    const body = f.body;
    const players = body.players;
    if (!Array.isArray(players)) {
      note(lineNo, 'state.players is not an array');
      continue;
    }
    if (Array.isArray(body.events)) stats.events += body.events.length;
    if (Array.isArray(body.stackCards)) stats.stackCards += body.stackCards.length;

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
          // Bribery, Gonti -- so this is not a failure, but an emitter
          // regression that dumped a library as full cards must not be silent.
          if (!isViewer && lib.cards.length > 0) {
            warn(lineNo, `players[${pi}] (id ${p.id}, NOT the viewing seat ${seat}) has ` +
              `${lib.cards.length} full card(s) in library.cards. Legal only while a ` +
              `canBeShownTo-true effect is running on THEIR library (Opposition Agent, ` +
              `Bribery); anything else is the largest possible leak (A3)`);
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
              if (!everRevealed.has(c.id)) {
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
          if ('name' in c && !everRevealed.has(c.id)) {
            note(lineNo, `players[${pi}] (the opponent) hand card ${c.id} carries a name: ${JSON.stringify(c.name)}`);
          }
          if (c.hidden !== true && !everRevealed.has(c.id)) {
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
  // "every state frame has a session header before it" -- the header is line 0,
  // so this is the same statement as: the first line is the header and no state
  // frame precedes it.  Both are checked above.

  if (stats.redacted === 0) {
    problems.push(`${path}: not one card was redacted -- either the opponent never held a card, or canBeShownTo is not being consulted`);
  }
  if (stats.viewerHandNamed === 0) {
    problems.push(`${path}: the viewer never saw a named card in their own hand -- the test proves nothing`);
  }
  stats.everRevealed = everRevealed.size;
  stats.missed = [...missed].sort();

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
const files = argv.filter((a) => !a.startsWith('--'));
const unknownFlag = argv.find((a) => a.startsWith('--') && a !== '--pre-amendment');
if (unknownFlag !== undefined) {
  console.error(`unknown flag ${unknownFlag}`);
  process.exit(2);
}
if (files.length === 0) {
  console.error('usage: node tools/check-redaction.mjs [--pre-amendment] <frames.jsonl> [...]');
  console.error('  --pre-amendment  accept a log recorded before the 2026-09-11 amendments');
  console.error('                   (a four-key stub, a library with no `cards`, a card with');
  console.error('                   no `token`/`alt`, a `faceDownHidden` object) as a WARN.');
  process.exit(2);
}
if (preAmendment) {
  console.log('--pre-amendment: missing P1/P2/P3/P15 keys are WARNings, not failures');
}

let failed = 0;
for (const path of files) {
  const { problems, warnings = [], stats } = checkFile(path, preAmendment);
  const ok = problems.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${path}`);
  console.log(`      frames=${stats.frames} (state=${stats.state}, other=${stats.other})`
    + `  bytes=${stats.bytes}  events=${stats.events}`);
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
