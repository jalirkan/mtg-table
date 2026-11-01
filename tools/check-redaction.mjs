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
 *       the viewer -- except ONE card while that player controls a "play with
 *       the top card of your library revealed" permanent (REVEALS_OWN_TOP,
 *       D315: Courser of Kruphix is in the owner's cubes).
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
 *       P/T outside the battlefield and the stack.  "May flip" is Forge's
 *       canFaceDownBeShownTo: in play, the controller only; elsewhere, a look
 *       permission (Gonti, Thief of Sanity, hideaway), admitted for an
 *       opponent's card only when the log shows how it was granted -- dug from
 *       a library into exile, alt and all, while the viewing seat's effect
 *       resolves -- and only while the card stays there (D371).
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
 * AMENDMENT M49 -- A FULL CARD'S `keywords`, AND WHY IT IS NEITHER OF THE ABOVE.
 *
 * `keywords` is the status layer's key (docs/protocol.md M49): Forge's keyword
 * CONSTANTS (`FLYING`, `FIRST_STRIKE`), `[]` on every face-down card, never on a
 * stub.  Every committed recording predates it, so it cannot be a
 * `sinceAmendment` key (that would fail all nineteen) -- and it is not one of
 * M6's `optional` comfort keys either, whose all-or-nothing rule is about a
 * BLOCK of keys a seat answers.  It is one key, and its own rule is per FILE: no
 * full card carries it (a pre-M49 recording) or every full card does, and a file
 * with some of each is a Snap.card branch that forgot it -- "M49's keywords are
 * HALF PRESENT".  Present, each entry must be a constant's name (never
 * `UNDEFINED`, never twice), so a display string or a card name fails; a
 * face-down card with a non-empty list fails; and a stub with the key fails A1's
 * exact key set like any sixth key.  Controls: fixtures/negative/redaction/m49-*.
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
 *
 * --empty-hand-ok (D460): A WARN FOR "NOTHING TO REDACT" ONLY WHERE THE FILE PROVES IT.
 *
 * "Not one card was redacted" and "the viewer never saw a named card in their own
 * hand" are coverage checks: a recording with no hidden information in it would
 * pass every leak rule vacuously.  The move atlas's branch games (D451) start from
 * a fork late in a game, and a short one can end with the opponent's hand empty in
 * every frame and their library sent as `count` with `cards: []` -- nothing to
 * redact, and nothing broken (J148: 24 such logs of 40,213 branches).  The flag
 * downgrades each assertion to a WARN only when the file itself shows there was
 * nothing to conceal:
 *
 *   - both: every state body lists the viewer's seat and every seat any state
 *     lists, at least two (a state that leaves the opponent out shows no hand of
 *     theirs, which proves nothing -- the #178 review);
 *   - "not one card was redacted": every state body shows every non-viewer seat's
 *     hand at count 0 (and no cards), every non-viewer library.cards is [], and no
 *     frame of any type lists a card in a hand or a library that the viewer does
 *     not own;
 *   - "the viewer never saw a named card": every state body shows the viewer's own
 *     hand at count 0.
 *
 * A broken canBeShownTo shows non-zero counts with full cards, and a non-zero
 * count with no stub fails the count check (and this proof) by itself, so both
 * still fail under the flag (check-redaction-selftest.mjs's negative controls).
 * Every leak rule is unchanged.  tools/cubelab's atlas passes it for its branch
 * logs alone; phase A's games and the baseline are checked without it.
 * ---------------------------------------------------------------------------
 */

import { readFileSync, realpathSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as zlib from 'node:zlib';

import { answerRefusal } from './adversary/answers.mjs';

const PROTOCOL_VERSION = 1;

/**
 * A3, D315 (the cube lab's follow-up 1): "Play with the top card of your library
 * revealed."  While a player controls one of these face up on the battlefield,
 * the top card of THEIR library is public, Forge's `canBeShownTo` says so, and
 * the bridge rightly sends it -- so an opponent's `library.cards` of exactly ONE
 * card is not a leak.  The names are every card script in the pinned 2.0.14 jar
 * whose static is `Affected$ Card.TopLibrary+YouCtrl | ... | MayLookAt$ Player`
 * with that Oracle text (Courser of Kruphix is in the owner's cubes).  Experimental
 * Frenzy carries the same static in Forge but its Oracle text is "You may look":
 * private, so it is NOT here and a recording that shows its top card to the
 * opponent still fails.
 */
const REVEALS_OWN_TOP = new Set([
  'Courser of Kruphix', 'Conspicuous Snoop', 'Crown of Convergence', 'Future Sight', "Garruk's Horde",
  'Goblin Spy', 'Magus of the Future', 'Melek, Izzet Paragon', 'Mul Daya Channelers', 'Oracle of Mul Daya',
  'Skill Borrower', 'Vampire Nocturnus',
]);
/** ...and "Players play with the top card of their libraries revealed": every player's top, whoever controls it. */
const REVEALS_EVERY_TOP = new Set(['Field of Dreams', 'Lantern of Insight', 'Wizened Snitches']);

/** The player ids whose library top is public in this state body (REVEALS_OWN_TOP / REVEALS_EVERY_TOP). */
function revealedTopsOf(players) {
  const out = new Set();
  for (const q of players) {
    for (const c of q?.zones?.battlefield?.cards ?? []) {
      if (!c || c.hidden === true || c.faceDown === true || typeof c.name !== 'string') continue;
      if (REVEALS_EVERY_TOP.has(c.name)) for (const r of players) out.add(r?.id);
      if (REVEALS_OWN_TOP.has(c.name)) out.add(typeof c.controller === 'number' ? c.controller : q.id);
    }
  }
  return out;
}

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
/**
 * Amendment M49: a key whose absence is legitimate for a WHOLE FILE (every
 * committed recording predates it) and a failure for part of one.  `checkShape`
 * counts each card that carries it and each that does not into
 * `missed.perFile`, and the end of the file says which (see `keywords`).
 */
const perFile = (f, label) => {
  const g = (v) => f(v);
  g.perFileKey = label;
  return g;
};
const arrayOf = (f) => (v) => Array.isArray(v) && v.every(f);
const plainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * --empty-hand-ok (D460): does `x` (a frame body, any type) list a card in a hand
 * or a library that `seat` does not own?  A card here is any object with a numeric
 * `id` and a `zone` of "hand" or "library"; its owner is `owner`, else (the
 * pre-P1 stub) `controller`.  A stub counts as much as a full card: either says
 * the opponent held something.
 */
function listsOthersHiddenCard(x, seat, depth = 0) {
  if (depth > 64 || x === null || typeof x !== 'object') return false;
  if (Array.isArray(x)) return x.some((v) => listsOthersHiddenCard(v, seat, depth + 1));
  if (num(x.id) && (x.zone === 'hand' || x.zone === 'library')) {
    const owner = num(x.owner) ? x.owner : x.controller;
    if (owner !== seat) return true;
  }
  return Object.values(x).some((v) => listsOthersHiddenCard(v, seat, depth + 1));
}
const mapOf = (f) => (v) => plainObject(v) && Object.values(v).every(f);
const oneOf = (...values) => (v) => values.includes(v);

/**
 * Amendment M49: one keyword -- a `forge.game.keyword.Keyword` constant's
 * `name()`, and nothing else.  `UNDEFINED` is the constant the bridge omits, so
 * it never appears.  A display string (`Flying`), rules text or a card name
 * cannot match, which is what makes the vocabulary closed.
 */
const KEYWORD_CONSTANT = /^[A-Z][A-Z0-9_]*$/;
const keywordName = (v) => typeof v === 'string' && KEYWORD_CONSTANT.test(v) && v !== 'UNDEFINED';
const keywordList = (v) => Array.isArray(v) && v.every(keywordName) && new Set(v).size === v.length;

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
  // Amendment M49 -- Keyword constants only; per file, all or none (see the header).
  keywords: perFile(keywordList, 'M49 (keywords)'),
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

/** Amendment M61: one `state.playable` entry -- a card id, a zone that is not in play, its abilities. */
const PLAYABLE_ZONES = ['hand', 'graveyard', 'exile', 'command', 'library'];
const playableEntry = (e) =>
  plainObject(e) && sameKeys(e, ['cardId', 'zone', 'abilities']) && num(e.cardId) &&
  PLAYABLE_ZONES.includes(e.zone) && Array.isArray(e.abilities) && e.abilities.length > 0 &&
  e.abilities.every((a) =>
    plainObject(a) && sameKeys(a, ['abilityId', 'label', 'isSpell']) &&
    num(a.abilityId) && str(a.label) && bool(a.isSpell));

/**
 * Amendment M61 (D413), the hidden-information half: `state.playable` says
 * "this card is yours and you may play it now", so every entry must name a
 * FULL card (never a stub) in the VIEWING seat's own zone of that name in the
 * same frame -- never an opponent's card, never a card on the battlefield --
 * and the list is only ever written at that seat's priority.
 */
function checkPlayable(body, seat) {
  if (!Array.isArray(body.playable)) return [];
  const out = [];
  if (body.priority !== seat) {
    out.push(`state.playable is a list while priority is ${JSON.stringify(body.priority)}, not the ` +
      `viewing seat ${String(seat)} -- it is written only at the seat's own priority, null otherwise (M61)`);
  }
  const me = (body.players ?? []).find((p) => plainObject(p) && p.id === seat);
  body.playable.forEach((e, i) => {
    if (!plainObject(e)) return;   // the shape check says so
    const zone = me && plainObject(me.zones) ? me.zones[e.zone] : undefined;
    const card = Array.isArray(zone?.cards) ? zone.cards.find((c) => plainObject(c) && c.id === e.cardId) : undefined;
    if (card === undefined || card.hidden === true || card.faceDownHidden === true) {
      out.push(`state.playable[${i}] names card ${JSON.stringify(e.cardId)} in ${JSON.stringify(e.zone)}, which ` +
        `is not a full card in the viewing seat's own ${JSON.stringify(e.zone)} in this frame -- the list is the ` +
        `seat's own cards only, never the opponent's and never a concealed one (M61, D413)`);
    }
  });
  return out;
}

/** Amendment M63: one `state.activatable` entry -- a permanent's id, the battlefield, its abilities (never spells). */
const activatableEntry = (e) =>
  plainObject(e) && sameKeys(e, ['cardId', 'zone', 'abilities']) && num(e.cardId) &&
  e.zone === 'battlefield' && Array.isArray(e.abilities) && e.abilities.length > 0 &&
  e.abilities.every((a) =>
    plainObject(a) && sameKeys(a, ['abilityId', 'label', 'isSpell']) &&
    num(a.abilityId) && str(a.label) && a.isSpell === false);

/**
 * Amendment M63 (D420), the hidden-information half: `state.activatable` says
 * "this permanent is yours to use now", so every entry must name a FULL card
 * on the battlefield that the VIEWING seat controls in the same frame -- never
 * an opponent's permanent, never a concealed one -- and the list is only ever
 * written at that seat's priority.
 */
function checkActivatable(body, seat) {
  if (!Array.isArray(body.activatable)) return [];
  const out = [];
  if (body.priority !== seat) {
    out.push(`state.activatable is a list while priority is ${JSON.stringify(body.priority)}, not the ` +
      `viewing seat ${String(seat)} -- it is written only at the seat's own priority, null otherwise (M63)`);
  }
  const onField = [];
  for (const p of body.players ?? []) {
    const cards = plainObject(p) && plainObject(p.zones) ? p.zones.battlefield?.cards : undefined;
    if (Array.isArray(cards)) onField.push(...cards);
  }
  body.activatable.forEach((e, i) => {
    if (!plainObject(e)) return;   // the shape check says so
    const card = onField.find((c) => plainObject(c) && c.id === e.cardId);
    if (card === undefined || card.hidden === true || card.faceDownHidden === true || card.controller !== seat) {
      out.push(`state.activatable[${i}] names card ${JSON.stringify(e.cardId)}, which is not a full card on the ` +
        `battlefield controlled by the viewing seat in this frame -- the list is the seat's own permanents only, ` +
        `never the opponent's and never a concealed one (M63, D420)`);
    }
  });
  return out;
}

const ids = (v) => Array.isArray(v) && v.every(num);

/**
 * Amendments M65 / M66 (D422, D423): `input.selectable.chosen` and
 * `input.selectable.playerIds`, the shape and who they may name.  Both are
 * ids only, and both describe the VIEWING seat's own input (an input is a
 * seat's by construction): `playerIds` names seats; `chosen` names what the
 * engine offered this seat in the same input (`selectable.cardIds`, the
 * seats), or -- in a declaration -- its own creatures on the battlefield and
 * the attackers it blocks.  `state` is the last snapshot before this input.
 * Each key is per FILE, all or none (a seat writes both on every input).
 */
function checkSelection(body, seat, state, missed) {
  const out = [];
  const sel = plainObject(body.selectable) ? body.selectable : null;
  if (sel === null) return out;
  const tally = (label, present, where) => {
    const t = missed.perFile.get(label) ?? { present: 0, absent: 0, firstAbsent: null };
    if (present) t.present += 1;
    else {
      t.absent += 1;
      t.firstAbsent ??= where;
    }
    missed.perFile.set(label, t);
  };
  tally('M66 (playerIds)', 'playerIds' in sel, 'input.selectable');
  tally('M65 (chosen)', 'chosen' in sel, 'input.selectable');
  const seats = new Set((state?.players ?? []).map((p) => p?.id).filter(num));
  const isSeat = (id) => seats.size === 0 || seats.has(id);
  if ('playerIds' in sel && sel.playerIds !== null) {
    if (!ids(sel.playerIds)) {
      out.push(`input.selectable.playerIds = ${JSON.stringify(sel.playerIds)} is not null or a list of ids (M66)`);
    } else {
      for (const id of sel.playerIds) {
        if (!isSeat(id)) out.push(`input.selectable.playerIds names ${String(id)}, which is not a seat of this game -- player ids never travel as card ids (M66, D423)`);
      }
    }
  }
  if (!('chosen' in sel) || sel.chosen === null) return out;
  const c = sel.chosen;
  const shaped = plainObject(c) && sameKeys(c, ['cardIds', 'playerIds', 'blocks', 'attacks']) &&
    ids(c.cardIds) && ids(c.playerIds) &&
    Array.isArray(c.blocks) && c.blocks.every((b) => plainObject(b) && sameKeys(b, ['blockerId', 'attackerId']) && num(b.blockerId) && num(b.attackerId)) &&
    Array.isArray(c.attacks) && c.attacks.every((a) => plainObject(a) && sameKeys(a, ['attackerId', 'defender']) && num(a.attackerId) &&
      plainObject(a.defender) && sameKeys(a.defender, ['kind', 'id']) && oneOf('player', 'card')(a.defender.kind) && num(a.defender.id));
  if (!shaped) {
    out.push(`input.selectable.chosen = ${JSON.stringify(c)} is not {cardIds, playerIds, blocks, attacks} (M65)`);
    return out;
  }
  for (const id of c.playerIds) {
    if (!isSeat(id)) out.push(`input.selectable.chosen.playerIds names ${String(id)}, which is not a seat of this game (M65)`);
  }
  // A full card on the battlefield in the last snapshot, and who controls it.
  const onField = new Map();
  for (const p of state?.players ?? []) {
    for (const card of (plainObject(p) && plainObject(p.zones) ? p.zones.battlefield?.cards : null) ?? []) {
      if (plainObject(card) && num(card.id)) onField.set(card.id, card);
    }
  }
  const own = (id) => {
    const card = onField.get(id);
    return card !== undefined && card.hidden !== true && card.faceDownHidden !== true && card.controller === seat;
  };
  const declaration = c.blocks.length > 0 || c.attacks.length > 0;
  if (!declaration) {
    // A target or a list entry: only what the engine offered this seat here.
    const offered = new Set(Array.isArray(sel.cardIds) ? sel.cardIds : []);
    for (const id of c.cardIds) {
      if (!offered.has(id)) {
        out.push(`input.selectable.chosen.cardIds names card ${String(id)}, which was not offered in this ` +
          `input's selectable.cardIds -- a choice is one of the engine's offers to this seat (M65, D422)`);
      }
    }
  }
  for (const b of c.blocks) {
    if (!own(b.blockerId)) {
      out.push(`input.selectable.chosen.blocks names blocker ${String(b.blockerId)}, which is not a full card on the ` +
        `battlefield controlled by the viewing seat -- the declaration is this seat's own (M65, D422)`);
    }
    if (!onField.has(b.attackerId)) {
      out.push(`input.selectable.chosen.blocks names attacker ${String(b.attackerId)}, which is not on the battlefield (M65)`);
    }
  }
  for (const a of c.attacks) {
    if (!own(a.attackerId)) {
      out.push(`input.selectable.chosen.attacks names attacker ${String(a.attackerId)}, which is not a full card on the ` +
        `battlefield controlled by the viewing seat (M65, D422)`);
    }
    if (a.defender.kind === 'player' ? !isSeat(a.defender.id) : !onField.has(a.defender.id)) {
      out.push(`input.selectable.chosen.attacks defender ${JSON.stringify(a.defender)} is neither a seat nor a permanent (M65)`);
    }
  }
  if (declaration) {
    const named = new Set([...c.blocks.map((b) => b.blockerId), ...c.attacks.map((a) => a.attackerId)]);
    if (c.cardIds.length !== named.size || c.cardIds.some((id) => !named.has(id))) {
      out.push(`input.selectable.chosen.cardIds ${JSON.stringify(c.cardIds)} are not exactly the declared ` +
        `${c.blocks.length > 0 ? 'blockers' : 'attackers'} (M65)`);
    }
  }
  return out;
}

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
        // M64 (D421) adds `endStepOrOpponent`.
        oneOf('endOfTurn', 'marker', 'stack', 'endStepOrOpponent')(v.kind) &&
        nullable(num)(v.playerId) &&
        nullable(str)(v.phase),
    ),
  ),
  // M6, amendment M35.
  undo: optional(
    nullable((v) => plainObject(v) && sameKeys(v, ['can', 'depth']) && bool(v.can) && num(v.depth)),
  ),
  // Amendment M61 (D413).  Written by a seat on every frame -- null off its
  // priority -- and never by an AI-vs-AI recorder, so per FILE: all or none.
  // Who each entry may name is `checkPlayable`'s.
  playable: perFile(nullable((v) => Array.isArray(v) && v.every(playableEntry)), 'M61 (playable)'),
  // Amendment M63 (D420).  The battlefield's half, under M61's rule: per FILE,
  // all or none (a file recorded between M61 and M63 carries `playable` alone).
  // Who each entry may name is `checkActivatable`'s.
  activatable: perFile(nullable((v) => Array.isArray(v) && v.every(activatableEntry)), 'M63 (activatable)'),
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
  // M68: an assign_amount target's floor (1 with atLeastOne, else 0).
  'min',
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
/**
 * M68 (D426): why an answer to an ask a bridge since M68 wrote is one the
 * bridge must refuse, judged from the ask's own wire fields -- the same rules
 * as `bridge/src/mtgtable/AnswerRule.java` (Forge's dialogs: ListChooser,
 * DualListBox, VAssignGenericAmount, getInteger's loop), or null when it is
 * legal.  One JS copy of them, shared with the adversarial seat (D428).
 */
const m68Refusal = answerRefusal;

const ASK_COMMON = { askId: str, kind: str, timeoutMs: num };
/** M68 (D426): `reason` on one kind's asks -- per file and per kind, all or none. */
function m68Reason(kind) {
  return perFile(nullable(str), `M68 (${kind}.reason)`);
}
const ASK_SHAPES = {
  // cardId is NOT nullable: with no host card there is nothing to attach a menu
  // to, so the bridge skips the ask entirely rather than emitting a null.
  // Amendment M68 (D426): every kind but assign_damage (M67's) gained
  // `reason` -- why the bridge refused the last answer, null on a first
  // asking.  Per file, all or none, like M67's.
  ability_menu: { cardId: num, options: arrayOf(askOption), reason: m68Reason('ability_menu') },
  confirm: {
    prompt: str, title: str, yesLabel: str, noLabel: str,
    defaultYes: bool, card: nullable(plainObject), reason: m68Reason('confirm'),
  },
  options: {
    prompt: str, title: str, options: arrayOf(askOption),
    defaultIndex: num, card: nullable(plainObject), reason: m68Reason('options'),
  },
  // `initial` is a string, "" when Forge has none -- like every other string
  // field on the wire.  A null here was a shape neither end declared.  M68:
  // `min` / `max`, getInteger's bounds for a numeric ask (null when the bridge
  // does not know them, and on a free-text ask).
  text: {
    prompt: str, title: str, initial: str, suggestions: arrayOf(str), numeric: bool,
    min: perFile(nullable(num), 'M68 (text.min)'), max: perFile(nullable(num), 'M68 (text.max)'),
    reason: m68Reason('text'),
  },
  choose_list: {
    prompt: str, options: arrayOf(askOption), preselected: arrayOf(num),
    min: num, max: num, reveal: bool, reason: m68Reason('choose_list'),
  },
  order: {
    prompt: str, destLabel: str, source: arrayOf(askOption), dest: arrayOf(askOption),
    min: num, max: num, referenceCardId: nullable(num),
    sideboardMode: bool, showRemember: bool, reason: m68Reason('order'),
  },
  choose_entities: {
    prompt: str, options: arrayOf(askOption), min: num, max: num,
    delayedReveal: nullable(delayedRevealShape), reason: m68Reason('choose_entities'),
  },
  // attackerId IS nullable, declared at both ends: Forge's signature allows a
  // null attacker and the emitter cannot prove it never happens, so the type
  // says what the code can do rather than what a run happened to produce.
  assign_damage: {
    attackerId: nullable(num), total: num, overrideOrder: bool, maySkip: bool,
    // Amendment M67 (D424): may the defender (index 0) take damage, and why
    // the bridge refused the last answer (null on a first asking).  Per file,
    // all or none: every assign_damage ask a bridge since M67 writes has both.
    defenderAllowed: perFile(bool, 'M67 (assign_damage.defenderAllowed)'),
    reason: perFile(nullable(str), 'M67 (assign_damage.reason)'),
    targets: arrayOf(askOption),
  },
  // M68: each target's `min` (1 with atLeastOne) and `max` (the dialog's cap,
  // never null since M68) ride on the target; `reason` on the body.
  assign_amount: {
    sourceCardId: nullable(num), total: num, atLeastOne: bool, label: str,
    targets: arrayOf(askOption), reason: m68Reason('assign_amount'),
  },
  manipulate_list: {
    prompt: str, cards: arrayOf(askOption), manipulable: arrayOf(num),
    toTop: bool, toBottom: bool, toAnywhere: bool, reason: m68Reason('manipulate_list'),
  },
  // M68: Forge's two deck-size bounds when it enforces them, else null.
  sideboard: {
    prompt: str, main: arrayOf(askOption), side: arrayOf(askOption),
    mainMin: perFile(nullable(num), 'M68 (sideboard.mainMin)'),
    sideMax: perFile(nullable(num), 'M68 (sideboard.sideMax)'),
    reason: m68Reason('sideboard'),
  },
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
    if (shape[k].perFileKey !== undefined && missed !== null && missed.perFile) {
      // M49: counted per file either way; the end of the file decides.
      const tally = missed.perFile.get(shape[k].perFileKey) ?? { present: 0, absent: 0, firstAbsent: null };
      if (k in value) tally.present += 1;
      else {
        tally.absent += 1;
        tally.firstAbsent ??= where;
      }
      missed.perFile.set(shape[k].perFileKey, tally);
    }
    if (!(k in value)) {
      if (shape[k].perFileKey !== undefined) continue;
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
  // M49: a face-down card's keywords are withheld like its name -- `[]` in both
  // branches of gate 2, whatever the face-down characteristic carries.
  if (card.faceDown === true && Array.isArray(card.keywords) && card.keywords.length > 0) {
    out.push(`${where} is face down and carries keywords ${JSON.stringify(card.keywords)} -- ` +
      `a face-down card's keywords are [] like its name (docs/protocol.md M49)`);
  }
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

/**
 * A frame log's text, whatever its compression (by suffix): `.gz` through
 * gunzip, `.zst` through Node's own zstd (zlib.zstdDecompressSync, Node 22.15+
 * and 23.8+; CI and the PC run 24), anything else as UTF-8.
 */
function readLogText(path) {
  const raw = readFileSync(path);
  if (path.endsWith('.gz')) return zlib.gunzipSync(raw).toString('utf8');
  if (path.endsWith('.zst')) {
    if (typeof zlib.zstdDecompressSync !== 'function') {
      throw new Error(`${path}: reading a .zst log needs Node's zlib zstd (Node >= 22.15 or 23.8; this is ${process.version}) -- D370`);
    }
    return zlib.zstdDecompressSync(raw).toString('utf8');
  }
  return raw.toString('utf8');
}

/**
 * One log's verdict -> {problems, warnings, stats, undecided, skipped, decidedBytes}.  Exported for
 * check-redaction-selftest.mjs's prefix sweep, which passes `text` (a prefix, in memory) for `path`.
 */
export function checkFile(path, { preAmendment = false, opponentLibraryOk = false, clientLog = false, partial = false, emptyHandOk = false, text: given = null } = {}) {
  const problems = [];
  const note = (line, msg) => problems.push(`${path}:${line}: ${msg}`);
  /*
   * --partial (D440's served prefix; see PARTIAL MODE below the flags): the
   * failures a LATER line could still cure are held here instead of in
   * `problems`, keyed by line, and the coverage checks that only a whole game
   * can meet are named in `skipped` rather than failed.
   */
  const undecided = new Map();   // lineNo -> [msg]
  const skipped = [];
  /** A failure a later line could cure (see `curableLine`): undecided in --partial, a failure otherwise. */
  const noteCurable = (line, msg) => {
    if (partial && line === curableLine) {
      const l = undecided.get(line) ?? [];
      l.push(`${path}:${line}: ${msg}`);
      undecided.set(line, l);
    } else note(line, msg);
  };
  let curableLine = -1;
  /** --partial: the prefix holds an `over`, so the game is over and nothing in it waits on a later line. */
  let logEnded = false;

  // A `.gz` log (the cube lab's in-worker recordings, D315) or a `.zst` one
  // (a finished queue night's archive, D370) is read whole and checked exactly
  // as its plain text would be.
  const text = given ?? readLogText(path);
  const rawLines = text.split('\n');
  const lines = [];
  /** The byte offset each of `lines` starts at (--partial reports how far its verdict reaches in bytes). */
  const lineStart = [];
  {
    let at = 0;
    for (const l of rawLines) {
      if (l.length > 0) { lines.push(l); lineStart.push(at); }
      at += Buffer.byteLength(l, 'utf8') + 1;
    }
  }
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

  /*
   * Section 8.1, amendment M47.  `paceMs` is OPTIONAL and says the recorder ran
   * with `--pace` -- every `t` in the file is the engine's clock stretched by
   * the dwells.  Only an AI-vs-AI recording is ever paced (a seat has a player
   * setting the pace), so it is a failure beside `transport`, and a failure
   * unless it is a positive integer.
   */
  if (header.paceMs !== undefined) {
    if (!Number.isInteger(header.paceMs) || header.paceMs <= 0) {
      note(1, `session header "paceMs" must be a positive integer (section 8.1, M47), got ` +
        `${JSON.stringify(header.paceMs)}`);
    }
    if (header.transport !== undefined) {
      note(1, `session header carries both "paceMs" and "transport" -- only an AI-vs-AI recording ` +
        `(mtgtable.RecordMatch --pace) is paced (section 8.1, M47)`);
    }
  }

  /*
   * Amendment M57 (D358).  `playExplore` is OPTIONAL and says this AI-vs-AI
   * recording explored: some decisions were answered by a random legal move or
   * a close-call coin.  Exactly three keys -- epsilon, closeCall (numbers in
   * [0, 1]) and opening (a boolean) -- and never beside `transport`: a seat a
   * person plays never explores.
   */
  if (header.playExplore !== undefined) {
    const pe = header.playExplore;
    if (!pe || typeof pe !== 'object' || Array.isArray(pe)) {
      note(1, `session header "playExplore" must be an object (M57), got ${JSON.stringify(pe)}`);
    } else {
      for (const [k, v] of Object.entries(pe)) {
        if (!(k in PLAY_EXPLORE_HEADER)) note(1, `session header playExplore carries an unexpected key "${k}" (M57)`);
        else if (typeof v !== PLAY_EXPLORE_HEADER[k] || (typeof v === 'number' && !(v >= 0 && v <= 1))) {
          note(1, `session header playExplore.${k} = ${JSON.stringify(v)} (M57)`);
        }
      }
      for (const k of Object.keys(PLAY_EXPLORE_HEADER)) if (!(k in pe)) note(1, `session header playExplore is missing "${k}" (M57)`);
    }
    if (header.transport !== undefined) {
      note(1, 'session header carries both "playExplore" and "transport" -- only an AI-vs-AI recording explores (M57, D358)');
    }
  }

  /*
   * Amendment M59 (D402).  `humans: 2` is OPTIONAL and says the other seat was a
   * PERSON at a table of two, so `hello_ok.match` takes its two-person form and
   * `table` frames may appear.  Only on a log a seat played (beside `transport`).
   */
  const tableOfTwo = header.humans === 2;
  if (header.humans !== undefined) {
    if (header.humans !== 2) note(1, `session header "humans" must be 2 when present (M59), got ${JSON.stringify(header.humans)}`);
    if (header.transport === undefined) note(1, 'session header "humans" without "transport" -- only a seat a person plays sits at a table of two (M59)');
  }
  /*
   * Amendment M62 (D414).  `ai` is OPTIONAL and names the AI seat's controller when
   * it is not plain Forge: {policy: "outlets"} or {policy: "search", version,
   * budgetMs, config} -- the search's own knobs, never a card or a deck.  Only on
   * a seat's log (beside `transport`), never at a table of two (no AI seat).
   */
  if (header.ai !== undefined) {
    const ai = header.ai;
    if (!ai || typeof ai !== 'object' || Array.isArray(ai)) {
      note(1, `session header "ai" must be an object (M62), got ${JSON.stringify(ai)}`);
    } else {
      const keys = ai.policy === 'search' ? ['policy', 'version', 'budgetMs', 'config'] : ['policy'];
      if (ai.policy !== 'outlets' && ai.policy !== 'search') note(1, `session header ai.policy=${JSON.stringify(ai.policy)} is not outlets | search (M62; plain Forge writes no "ai")`);
      for (const k of Object.keys(ai)) if (!keys.includes(k)) note(1, `session header "ai" carries an unexpected key "${k}" (M62)`);
      if (ai.policy === 'search') {
        if (ai.version !== null && !(typeof ai.version === 'string' && /^search-v\d+$/.test(ai.version))) note(1, `session header ai.version=${JSON.stringify(ai.version)} (M62)`);
        if (!Number.isInteger(ai.budgetMs) || ai.budgetMs < 50 || ai.budgetMs > 60000) note(1, `session header ai.budgetMs=${JSON.stringify(ai.budgetMs)} is not 50-60000 (M62)`);
        if (typeof ai.config !== 'string' || !/^ms=\d+,/.test(ai.config)) note(1, `session header ai.config=${JSON.stringify(ai.config)} is not a search config (M62)`);
      }
    }
    if (header.transport === undefined) note(1, 'session header "ai" without "transport" -- only a seat a person plays names its opponent this way (M62)');
    if (header.humans !== undefined) note(1, 'session header "ai" at a table of two -- there is no AI seat (M62)');
  }
  /*
   * Amendment M60 (D407).  `record` is OPTIONAL and is this seat's consent to the
   * human test set and the automatic review for this game: a boolean, and only at
   * a table of two (a game against the AI is the owner's own, D369).
   */
  if (header.record !== undefined) {
    if (typeof header.record !== 'boolean') note(1, `session header "record" must be true or false (M60), got ${JSON.stringify(header.record)}`);
    if (!tableOfTwo) note(1, 'session header "record" without "humans": 2 -- only a seat at a table of two says whether it may be recorded (M60)');
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
    frames: 0, state: 0, other: 0, bytes: given !== null ? Buffer.byteLength(given, 'utf8') : statSync(path).size,
    cardsChecked: 0, redacted: 0, faceDown: 0, stackCards: 0,
    viewerHandNamed: 0, opponentHandCards: 0, events: 0, shapeChecks: 0,
    texts: 0, textsConcealed: 0,
    libraryRevealed: 0, revealedTops: 0, altBlocks: 0, altByLook: 0, tokens: 0, asks: 0, promptsScanned: 0,
    everRevealed: 0, answers: 0, answerKinds: new Set(), unanswered: 0,
    askShapeChecks: 0, notices: 0, overs: 0, nullDefaults: 0,
    stackItems: 0,
    maxTurn: 0,
    hellos: 0, matchChecked: 0, yourProfileChecked: 0, aiPolicyChecked: 0,
    tableMatchChecked: 0, tables: 0,
    damageRefusalsSeen: 0, answerRefusalsSeen: 0,
  };
  const seq = { s2c: 0, c2s: 0, ai: 0 };
  /**
   * --empty-hand-ok (D460): the first line that spoils each proof (null: none did).
   * opponentHand -- a non-viewer hand whose count is not 0 (or that lists a card);
   * opponentListed -- a non-viewer library.cards that is not [], or any frame that
   * lists a card in a hand or library the viewer does not own; viewerHand -- the
   * viewer's own hand at a count other than 0.  seats -- every seat any state
   * lists, and the state listing the fewest of them (a state that leaves a seat
   * out proves nothing about that seat's hand: both proofs need every state to
   * list the viewer and every other seat, and at least one other).
   */
  const emptyProof = { opponentHand: null, opponentListed: null, viewerHand: null };
  const proofSeats = { all: new Set(), fewest: Infinity, fewestLine: null, viewerMissing: null };
  let sawState = false;
  const seat = header.seat;
  /** M65 / M66: the last state body, which an input's selection is checked against. */
  let lastStateBody = null;
  /** M55 / D347: every state frame's index in frames[] -> {seq, the ids it shows the viewer}; the decision lines, audited after. */
  const stateAt = new Map();
  const stateOrder = [];
  const aiLines = [];

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
  /** M49: per-file keys (see `perFile`) -> how many full cards carried it and did not. */
  missed.perFile = new Map();

  /**
   * A6 -- the temporal half.  An id joins this set the moment the viewer was
   * legitimately shown the card: in a public zone, in their own hand, in a
   * library's revealed slice, inside an `ask` body, or as `input.focusCard`.
   * A full card in someone ELSE's hidden zone whose id is not in here means the
   * bridge served a name the seat was never shown.
   */
  const everRevealed = new Set();
  /**
   * A9 / D371 -- the ids of opponents' face-down cards in exile whose alt the
   * previous state frame admitted under a look permission, and whether the
   * viewing seat controlled a stack item in that frame.
   */
  let lookGrants = new Set();
  /** id -> the last zone other than a hand a card was serialised in (the hand diagnostic, D371). */
  const handLastSeen = new Map();
  let viewerStackBefore = false;
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
  /**
   * M67 (D424): an assign_damage answer the rule forbids on the wire's own
   * terms -- damage on the defender while `defenderAllowed` is false, or a
   * total that is not the ask's `total` -- waiting to be REFUSED: the next ask
   * must be assign_damage again with a `reason`, and no state may show the
   * attacker dealing damage first.  Either other outcome means the bridge
   * applied an illegal map.
   */
  let illegalDamage = null;
  /**
   * M68 (D426): the same for every other kind -- an answer to an ask carrying
   * M68's `reason` key that the kind's rule forbids (`m68Refusal`): the next
   * ask must be the same kind again with a reason, or the bridge applied it.
   */
  let illegalAnswer = null;
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
   * 2026-09-27 lacks it and `mtgtable.RecordMatch` writes it only when given a
   * match setup (M47: `--match`, `--profile`, `--ai-profile`), so absence
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
    if (tableOfTwo || m.opponent !== undefined) {
      auditTableMatch(body, m, lineNo, where);
      return;
    }
    /*
     * Amendment M47: `yourProfile` -- the VIEWING seat's own AI profile -- is the
     * one key a recording may add, and only `mtgtable.RecordMatch` writes it,
     * because only there is the viewing seat an AI (a spectated game). A profile
     * is a fact about an AI, so on a stream whose players[] marks the viewer
     * human it is a failure: that is a seat telling the player what "profile"
     * they were playing under, i.e. an emitter describing a different match.
     */
    const hasYourProfile = Object.prototype.hasOwnProperty.call(m, 'yourProfile');
    // Amendment M56: `aiPolicy`, who answers for the AI seat (--ai-policy), is
    // optional -- MtgTable writes it, RecordMatch and the in-process recorders
    // do not -- and is one word of a fixed set, never a knob, a path or a name.
    const hasAiPolicy = Object.prototype.hasOwnProperty.call(m, 'aiPolicy');
    const matchKeys = ['yourDeck', 'aiDeck', 'aiProfile', 'games',
      ...(hasYourProfile ? ['yourProfile'] : []), ...(hasAiPolicy ? ['aiPolicy'] : [])];
    if (!sameKeys(m, matchKeys)) {
      note(lineNo, `${where} has keys ${JSON.stringify(Object.keys(m))}, expected exactly ` +
        `yourDeck, aiDeck, aiProfile, games (and, amendment M47, yourProfile when the viewer is an AI; ` +
        `amendment M56, aiPolicy)`);
    }
    if (hasAiPolicy) {
      stats.aiPolicyChecked++;
      if (!['plain', 'outlets', 'search'].includes(m.aiPolicy)) {
        note(lineNo, `${where}: aiPolicy must be one of plain, outlets, search (amendment M56), got ` +
          `${JSON.stringify(m.aiPolicy)}`);
      }
    }
    if (hasYourProfile) {
      stats.yourProfileChecked++;
      if (!str(m.yourProfile) || !/^[A-Za-z0-9][A-Za-z0-9 _()-]*$/.test(m.yourProfile)) {
        note(lineNo, `${where}: yourProfile must be a Forge AI profile name (amendment M47), got ` +
          `${JSON.stringify(m.yourProfile)}`);
      }
      const viewer = Array.isArray(body.players) ? body.players.find((p) => plainObject(p) && p.id === body.you) : undefined;
      if (viewer === undefined || viewer.isAi !== true) {
        note(lineNo, `${where}: yourProfile is present but players[] does not mark the viewing seat ` +
          `(id ${JSON.stringify(body.you)}) as an AI -- a profile is a fact about an AI seat, and only an ` +
          `AI-vs-AI recording (mtgtable.RecordMatch) writes it (amendment M47)`);
      }
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

  /**
   * Amendment M59 -- `hello_ok.match` at a table of two: {yourDeck, opponentDeck,
   * opponent: "human", games}.  The opponent's deck is its NAME and COUNT only,
   * exactly as `aiDeck` is (hard rule 8), there is no AI profile or policy, and
   * every player in players[] is a person.
   */
  function auditTableMatch(body, m, lineNo, where) {
    stats.tableMatchChecked++;
    if (!tableOfTwo) note(lineNo, `${where}: a two-person match (opponent: "human") in a log whose session header has no humans: 2 (M59)`);
    // Amendment M60 (D406): a game of a best of three adds `score`, the games each side won before it.
    const bo3 = m.games === 3;
    if (!sameKeys(m, ['yourDeck', 'opponentDeck', 'opponent', 'games', ...(bo3 ? ['score'] : [])])) {
      note(lineNo, `${where} has keys ${JSON.stringify(Object.keys(m))}, expected exactly yourDeck, opponentDeck, opponent, games at a table of two (M59)` +
        (bo3 ? ', and score in a best of three (M60)' : ''));
    }
    if (bo3) {
      const sc = m.score;
      const won = (v) => Number.isInteger(v) && v >= 0 && v <= 1;
      if (!plainObject(sc) || !sameKeys(sc, ['you', 'opponent']) || !won(sc.you) || !won(sc.opponent)) {
        note(lineNo, `${where}: score must be exactly {you, opponent}, each 0 or 1 -- the games won before this one (M60), got ${JSON.stringify(sc)}`);
      }
      const n = body.gameNumber;
      if (!Number.isInteger(n) || n < 1 || n > 3 || body.gameCount !== 3) {
        note(lineNo, `${where}: a best of three's hello_ok carries gameNumber 1-3 and gameCount 3 (M41, M60), got ${JSON.stringify([n, body.gameCount])}`);
      } else if (plainObject(sc) && won(sc.you) && won(sc.opponent) && sc.you + sc.opponent > n - 1) {
        note(lineNo, `${where}: score ${sc.you}-${sc.opponent} is more games than came before game ${n} (M60)`);
      }
    }
    if (m.opponent !== 'human') note(lineNo, `${where}: opponent must be "human" (M59), got ${JSON.stringify(m.opponent)}`);
    const count = (v) => Number.isInteger(v) && v >= 0;
    const yd = m.yourDeck;
    if (!plainObject(yd) || !sameKeys(yd, ['name', 'path', 'cards']) || !str(yd.name) || yd.name === '' ||
        !str(yd.path) || yd.path === '' || !count(yd.cards)) {
      note(lineNo, `${where}: yourDeck must be exactly {name, path, cards}, got ${JSON.stringify(yd)}`);
    }
    const od = m.opponentDeck;
    if (!plainObject(od) || !sameKeys(od, ['name', 'cards']) || !str(od.name) || od.name === '' || !count(od.cards)) {
      note(lineNo, `${where}: opponentDeck must be exactly {name, cards} -- the other person's decklist is ` +
        `hidden information (hard rule 8, M59), got ${JSON.stringify(od)}`);
    }
    if (m.games !== 1 && m.games !== 3) note(lineNo, `${where}: games must be 1, or 3 for a best of three, at a table of two (M59, M60), got ${JSON.stringify(m.games)}`);
    if (!Array.isArray(body.players) || body.players.some((p) => !plainObject(p) || p.isAi !== false)) {
      note(lineNo, `${where}: every player at a table of two is a person (isAi: false) (M59)`);
    }
    if (Array.isArray(header.decks) && header.decks.length > 0) {
      const mine = header.decks.find((d) => plainObject(d) && d.player === header.seat);
      const theirs = header.decks.find((d) => plainObject(d) && d.player !== header.seat);
      if (mine !== undefined && plainObject(yd) && (mine.path !== yd.path || mine.cards !== yd.cards)) {
        note(lineNo, `${where}: yourDeck does not match the session header's entry for the viewing seat`);
      }
      if (theirs !== undefined && plainObject(od) && theirs.cards !== od.cards) {
        note(lineNo, `${where}: opponentDeck.cards=${od.cards} but the session header says ${theirs.cards}`);
      }
    }
  }

  /**
   * Amendment M59 -- a `table` frame: who is at the table, whose decision it is
   * and its clock, and whether this seat may claim the win.  Exact keys; the
   * only strings are the two players' names.  Only at a table of two.
   */
  const TABLE_KEYS = ['you', 'seats', 'decisionTimeoutMs', 'graceMs', 'claimWinAt', 'canClaimWin'];
  const TABLE_SEAT_KEYS = ['seat', 'playerId', 'name', 'connected', 'deciding', 'decisionDeadline', 'awaySince'];
  function auditTable(body, lineNo) {
    stats.tables++;
    const where = 'table (amendment M59)';
    if (!tableOfTwo) note(lineNo, `${where}: a table frame in a log whose session header has no humans: 2`);
    if (!sameKeys(body, TABLE_KEYS)) {
      note(lineNo, `${where} has keys ${JSON.stringify(Object.keys(body))}, expected exactly ${TABLE_KEYS.join(', ')}`);
      return;
    }
    const ms = (v) => v === null || (Number.isInteger(v) && v > 0);
    if (body.you !== 0 && body.you !== 1) note(lineNo, `${where}: you must be 0 or 1`);
    if (!Number.isInteger(body.decisionTimeoutMs) || body.decisionTimeoutMs < 0) note(lineNo, `${where}: decisionTimeoutMs`);
    if (!Number.isInteger(body.graceMs) || body.graceMs < 0) note(lineNo, `${where}: graceMs`);
    if (!ms(body.claimWinAt)) note(lineNo, `${where}: claimWinAt must be null or epoch ms`);
    if (typeof body.canClaimWin !== 'boolean') note(lineNo, `${where}: canClaimWin must be a boolean`);
    if (!Array.isArray(body.seats) || body.seats.length !== 2) {
      note(lineNo, `${where}: seats must be two entries`);
      return;
    }
    body.seats.forEach((st, i) => {
      if (!plainObject(st) || !sameKeys(st, TABLE_SEAT_KEYS)) {
        note(lineNo, `${where}: seats[${i}] must have exactly ${TABLE_SEAT_KEYS.join(', ')}`);
        return;
      }
      if (st.seat !== i) note(lineNo, `${where}: seats[${i}].seat must be ${i}`);
      if (st.playerId !== null && !Number.isInteger(st.playerId)) note(lineNo, `${where}: seats[${i}].playerId`);
      if (!str(st.name) || st.name.length === 0 || st.name.length > 32) note(lineNo, `${where}: seats[${i}].name must be a short string`);
      if (typeof st.connected !== 'boolean' || typeof st.deciding !== 'boolean') note(lineNo, `${where}: seats[${i}] connected/deciding are booleans`);
      if (!ms(st.decisionDeadline) || !ms(st.awaySince)) note(lineNo, `${where}: seats[${i}] times are null or epoch ms`);
    });
  }

  function auditNonStateFrame(f, lineNo) {
    const body = f.body;
    if (f.type === 'table') {
      auditTable(body, lineNo);
      return;
    }
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

      // --- M67: an illegal assign_damage answer must come back as a re-ask --
      if (illegalDamage !== null) {
        const reAsk = body.kind === 'assign_damage' && str(body.reason) && body.reason !== '' &&
          body.attackerId === illegalDamage.attackerId;
        if (reAsk) stats.damageRefusalsSeen++;
        else {
          note(lineNo, `the assign_damage answer on line ${illegalDamage.line} (${illegalDamage.why}) was not ` +
            `refused: the next ask is ${JSON.stringify(body.kind)}${body.kind === 'assign_damage' ? ' with no reason' : ''}, ` +
            `not assign_damage again with a reason -- the bridge applied an illegal damage map (M67, D424)`);
        }
        illegalDamage = null;
      }
      if (illegalAnswer !== null) {
        if (body.kind === illegalAnswer.kind && str(body.reason) && body.reason !== '') stats.answerRefusalsSeen++;
        else {
          note(lineNo, `the ${illegalAnswer.kind} answer on line ${illegalAnswer.line} (${illegalAnswer.why}) was not ` +
            `refused: the next ask is ${JSON.stringify(body.kind)}${body.kind === illegalAnswer.kind ? ' with no reason' : ''}, ` +
            `not ${illegalAnswer.kind} again with a reason -- the bridge applied an illegal answer (M68, D426)`);
        }
        illegalAnswer = null;
      }

      // --- the drift half, per kind: exact key set + declared nullability ---
      const shape = ASK_SHAPES[body.kind];
      if (shape !== undefined) {
        stats.askShapeChecks++;
        for (const complaint of checkShape({ ...body }, { ...ASK_COMMON, ...shape }, `ask.${body.kind}`, missed)) {
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
        openAsks.set(body.askId, { kind: body.kind, count: optionCount(body), line: lineNo,
          dmg: body.kind === 'assign_damage' && typeof body.defenderAllowed === 'boolean'
            ? { defenderAllowed: body.defenderAllowed, total: body.total, attackerId: body.attackerId } : null,
          // M68: an ask with the `reason` key is one the bridge checks the answer to.
          checked: body.kind !== 'assign_damage' && 'reason' in body ? structuredClone(body) : null });
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
      // Amendments M65 / M66 (D422, D423).
      for (const complaint of checkSelection(body, seat, lastStateBody, missed)) note(lineNo, complaint);
      if (plainObject(body.selectable)) {
        if (Array.isArray(body.selectable.playerIds)) stats.selPlayers = (stats.selPlayers ?? 0) + 1;
        if (plainObject(body.selectable.chosen)) stats.selChosen = (stats.selChosen ?? 0) + 1;
      }
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
      // M67 / M68: a game that ends while an illegal answer waits for its
      // re-ask (a concede, the engine closing) asks nothing more; the bridge
      // returns the default then, never the illegal answer.
      illegalAnswer = null;
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
    if (open.dmg && plainObject(body.value)) {
      // M67: the halves of the rule the wire itself decides -- and, since M68,
      // the shape: a key that is not a target, a negative or fractional
      // amount.  (Lethal-before-the-defender is not judged here: a "divided as
      // you choose" attacker may skip it, and the wire does not say which one
      // divides.)
      const entries = Object.entries(body.value);
      const amounts = entries.map(([k, v]) => [k, typeof v === 'number' ? v : 0]);
      const sum = amounts.reduce((a, [, v]) => a + v, 0);
      const toDefender = amounts.filter(([k]) => k === '0').reduce((a, [, v]) => a + v, 0);
      const badKey = entries.find(([k]) => !/^[0-9]+$/.test(k) || Number(k) >= (open.count ?? 0));
      const badAmount = entries.find(([, v]) => typeof v !== 'number' || !Number.isInteger(v) || v < 0);
      const why = badKey !== undefined ? `target ${badKey[0]} not offered`
        : badAmount !== undefined ? `amount ${JSON.stringify(badAmount[1])} not a whole non-negative number`
        : toDefender > 0 && !open.dmg.defenderAllowed
          ? `${toDefender} to the defender with defenderAllowed false`
          : sum !== open.dmg.total ? `${sum} assigned of ${open.dmg.total}` : null;
      if (why !== null) {
        illegalDamage = { line: lineNo, why, attackerId: open.dmg.attackerId };
        if (badKey !== undefined || badAmount !== undefined) return;   // refused, not a client's A12 slip
      }
    }
    if (open.dmg && body.value !== null && body.value !== undefined && !plainObject(body.value)) {
      // M68: a malformed damage answer is refused too (before M68 it was a null).
      illegalDamage = { line: lineNo, why: 'not a map of amounts', attackerId: open.dmg.attackerId };
      return;
    }
    if (open.checked && body.value !== null && body.value !== undefined) {
      const why = m68Refusal(open.checked, body.value);
      if (why !== null) {
        // Legitimately in the log -- a client may send anything -- provided the
        // bridge refused it: the next ask decides.  A12's shape note would
        // call the CLIENT wrong, which is not this checker's business here.
        illegalAnswer = { line: lineNo, why, kind: open.kind };
        return;
      }
    }

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
    /*
     * PARTIAL MODE's one lookahead.  The log may be cut between a `state` and
     * the `ask` it was flushed for, so the LAST frame of a prefix -- walked back
     * past c2s frames exactly as above -- may yet be justified by a line that
     * has not been written.  Its A4/A6 complaints are undecided, not failures:
     * the prefix's verdict stops at its first byte, and the next check (with
     * the ask, or with any other s2c frame after it) decides it.
     */
    if (partial) {
      logEnded = parsed.some((x) => x.f !== null && x.f.type === 'over');
      let j = parsed.length - 1;
      while (j >= 0 && parsed[j].f !== null && parsed[j].f.dir === 'c2s') j--;
      if (j >= 0 && parsed[j].f !== null && parsed[j].f.type === 'state') curableLine = parsed[j].line;
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
    if (f.dir !== 's2c' && f.dir !== 'c2s' && f.dir !== 'ai' && !(isClientLog && f.dir === undefined)) {
      note(lineNo, `dir=${JSON.stringify(f.dir)}, expected "s2c", "c2s" or "ai"`);
    }
    if (typeof f.type !== 'string' || f.type.length === 0) note(lineNo, 'type is missing');
    if (f.body === null || typeof f.body !== 'object' || Array.isArray(f.body)) {
      note(lineNo, 'body must be an object');
      continue;
    }
    const dir = f.dir ?? 's2c';
    if (emptyHandOk && emptyProof.opponentListed === null && listsOthersHiddenCard(f.body, seat)) {
      emptyProof.opponentListed = lineNo;
    }
    if (dir === 'ai') {
      // M55 (D347): a recorder-only line, its own seq series, audited once the
      // whole file is read (a decision names a state frame and the ids in it).
      stats.decisionLines = (stats.decisionLines ?? 0) + 1;
      if (f.seq !== seq.ai + 1) note(lineNo, `seq=${f.seq} for dir=ai, expected ${seq.ai + 1} (gap or reorder)`);
      seq.ai = f.seq;
      aiLines.push({ f, lineNo, index: i - 1 });
      continue;
    }
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
    if (plainObject(f.body)) lastStateBody = f.body;
    if (illegalDamage !== null && Array.isArray(f.body?.events) &&
        f.body.events.some((e) => e?.kind === 'damage' && e.sourceCardId === illegalDamage.attackerId)) {
      note(lineNo, `card ${illegalDamage.attackerId} deals damage after the assign_damage answer on line ` +
        `${illegalDamage.line} (${illegalDamage.why}) and before any re-ask -- the bridge applied an illegal ` +
        `damage map (M67, D424)`);
      illegalDamage = null;
    }
    if (Array.isArray(f.body?.players)) {
      stateAt.set(i - 1, { seq: f.seq, lineNo, ids: visibleIds(f.body, seat), moves: zoneMoves(f.body), ownTokens: ownTokenIds(f.body, seat),
        ...stackEvents(f.body), ...listedIds(f.body) });
      stateOrder.push(i - 1);
    }
    if (typeof f.body?.turn === 'number' && f.body.turn > stats.maxTurn) stats.maxTurn = f.body.turn;

    const body = f.body;
    const players = body.players;
    if (!Array.isArray(players)) {
      note(lineNo, 'state.players is not an array');
      continue;
    }
    {
      // --empty-hand-ok (D460): which seats this state lists (a seat left out is a hand never shown).
      const ids = new Set(players.filter((p) => plainObject(p) && num(p.id)).map((p) => p.id));
      for (const id of ids) proofSeats.all.add(id);
      if (ids.size < proofSeats.fewest) { proofSeats.fewest = ids.size; proofSeats.fewestLine = lineNo; }
      if (!ids.has(seat) && proofSeats.viewerMissing === null) proofSeats.viewerMissing = lineNo;
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
    for (const complaint of checkPlayable(body, seat)) note(lineNo, complaint);
    if (Array.isArray(body.playable)) stats.playable = (stats.playable ?? 0) + body.playable.length;
    for (const complaint of checkActivatable(body, seat)) note(lineNo, complaint);
    if (Array.isArray(body.activatable)) stats.activatable = (stats.activatable ?? 0) + body.activatable.length;

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

    const revealedTops = revealedTopsOf(players);
    // A9 / D371: the evidence for a look permission on an opponent's face-down
    // card in exile -- what this frame dug out of a library into exile, and
    // whether an effect of the viewing seat's is resolving.
    const viewerStackNow = (body.stack ?? []).some((it) => plainObject(it) && it.controller === seat);
    const viewerEffect = viewerStackNow || viewerStackBefore;
    const dugToExile = new Set();
    for (const ev of body.events ?? []) {
      if (plainObject(ev) && ev.kind === 'zone' && ev.from?.zone === 'library' && ev.to?.zone === 'exile'
          && num(ev.cardId)) {
        dugToExile.add(ev.cardId);
      }
    }
    const nextGrants = new Set();
    for (let pi = 0; pi < players.length; pi++) {
      const p = players[pi];
      const zones = p.zones || {};
      const isViewer = (p.id === seat) || (seat === undefined && pi === 0);
      {
        // --empty-hand-ok (D460): is this hand empty, and is this library a bare count?
        const handEmpty = zones.hand?.count === 0 && Array.isArray(zones.hand?.cards) && zones.hand.cards.length === 0;
        if (isViewer) {
          if (!handEmpty && emptyProof.viewerHand === null) emptyProof.viewerHand = lineNo;
        } else {
          if (!handEmpty && emptyProof.opponentHand === null) emptyProof.opponentHand = lineNo;
          const libEmpty = Array.isArray(zones.library?.cards) && zones.library.cards.length === 0;
          if (!libEmpty && emptyProof.opponentListed === null) emptyProof.opponentListed = lineNo;
        }
      }

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
          if (!isViewer && lib.cards.length === 1 && revealedTops.has(p.id)) {
            // Their top card, revealed to everyone by a permanent they control
            // (REVEALS_OWN_TOP).  One card, and no A6 exemption: that stays the
            // viewer's own library's alone, below.
            stats.revealedTops++;
          } else if (!isViewer && lib.cards.length > 0) {
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
              // Forge's canFaceDownBeShownTo(viewer), in its own order (javap -c on
              // the pinned jar): mayPlayerLook(viewer) || [mind-slave] ||
              // isInZone(Battlefield, Stack, Sideboard) && getController() == viewer.
              // D371: the zone half is checked as written -- in play, the face is
              // the CONTROLLER's, never the owner's (an owner whose face-down
              // creature was stolen does not see it).  The look half
              // (mayPlayerLook) is a permission a log cannot show directly, so it
              // is admitted only in the one shape every face-down-with-a-look
              // effect has (DigEffect's ExileFaceDown + WithMayLook: Gonti, Lord
              // of Luxury; Thief of Sanity; hideaway): the card arrives in exile
              // FROM A LIBRARY with its alt in the same frame, while an effect the
              // viewing seat controls is resolving (on the stack in this frame or
              // the one before), and it keeps the alt only while it stays there.
              const inPlay = zname === 'battlefield' || zname === 'stack';
              const mine = owner === seat || c.controller === seat;
              if (inPlay && c.controller !== seat) {
                note(lineNo, `face-down card ${c.id} in ${zname} is controlled by player ${c.controller} ` +
                  `(owner ${owner}), not the viewing seat ${seat}, yet carries an "alt" block ` +
                  `naming it ${JSON.stringify(c.alt?.name)} -- canFaceDownBeShownTo ends ` +
                  `isInZone(Battlefield, Stack, Sideboard) && getController().equals(viewer) (A9)`);
              } else if (!inPlay && !mine) {
                const arrived = dugToExile.has(c.id) && zname === 'exile' && viewerEffect;
                const stayed = lookGrants.has(c.id) && zname === 'exile';
                if (arrived || stayed) {
                  nextGrants.add(c.id);
                  if (arrived) stats.altByLook++;
                } else {
                  note(lineNo, `face-down card ${c.id} in ${zname} is owned and controlled by player ` +
                    `${c.controller}, not the viewing seat ${seat}, yet carries an "alt" block naming it ` +
                    `${JSON.stringify(c.alt?.name)} -- outside play only a look permission ` +
                    `(mayPlayerLook) shows a face-down card, and the only shape a log can show for ` +
                    `one is a card exiled from a library, alt and all, while the viewing seat's ` +
                    `effect resolves (Gonti, Thief of Sanity), kept while it stays in exile (A9, D371)`);
                }
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
                noteCurable(lineNo, `players[${pi}] (not the viewing seat) has a FULL card ${c.id} ` +
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
            noteCurable(lineNo, `players[${pi}] (the opponent) hand card ${c.id} carries a name: ${JSON.stringify(c.name)}`);
          }
          if (c.hidden !== true && !revealedBy(c.id, lineNo)) {
            noteCurable(lineNo, `players[${pi}] (the opponent) hand card ${c.id} is not marked hidden`);
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
            // D371: say WHICH shape it was and where the card was last seen, so
            // the next quarantine names its cause (a stub means gate 0 or 1 said
            // no to the viewer's own hand: canBeShownTo(Hand) is
            // getController() == viewer, so the stub's controller is the clue).
            const shape = c.hidden === true
              ? `a redacted stub (owner ${c.owner}, controller ${c.controller}, zone ${JSON.stringify(c.zone)})`
              : `a full card with name ${JSON.stringify(c.name)} (faceDown ${c.faceDown}, controller ${c.controller})`;
            const last = handLastSeen.get(c.id);
            const where = last ? `; last seen outside this hand in ${last.zone} at line ${last.line}` : '';
            note(lineNo, `the viewer's own hand card ${c.id} has no name -- redaction is too aggressive ` +
              `(it is ${shape}${where})`);
          }
        }
      }
    }

    lookGrants = nextGrants;
    viewerStackBefore = viewerStackNow;
    for (const p of players) {
      for (const [zname, z] of Object.entries(p.zones ?? {})) {
        if (zname === 'hand') continue;
        for (const c of z?.cards ?? []) if (num(c?.id)) handLastSeen.set(c.id, { zone: zname, line: lineNo });
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

  if (!sawState) {
    // Coverage, not a leak: a served prefix may end before the first state (D440).
    if (partial) skipped.push('no state frames at all');
    else note(lines.length, 'no state frames at all');
  }

  // --- M55 / D347: an AI seat's decision records, its OWN recording only ---
  if (aiLines.length > 0) {
    for (const complaint of auditDecisions(aiLines, stateAt, stateOrder, header, isClientLog, stats)) {
      if (partial && complaint.curable && !logEnded) {
        // D3 allows the NEXT state frame's cards too, and a prefix may not hold it yet.
        const l = undecided.get(complaint.lineNo) ?? [];
        l.push(`${path}:${complaint.lineNo}: ${complaint.msg}`);
        undecided.set(complaint.lineNo, l);
      } else note(complaint.lineNo, complaint.msg);
    }
    stats.decisions = aiLines.filter((x) => x.f.type === 'decision').length;
  }

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
  /*
   * --empty-hand-ok (D460): each assertion's proof that there was nothing to
   * conceal, from this file alone -- or, under the flag, why it does not hold.
   */
  const provable = emptyHandOk && num(seat) && stats.state > 0;
  // Every state lists the viewer and every other seat any state lists -- at least one other.  A state
  // without the opponent shows no hand of theirs at all, which proves nothing (the #178 review).
  const seatsWhyNot = !provable ? null
    : proofSeats.viewerMissing !== null ? `the viewing seat ${seat} is not listed in the state at line ${proofSeats.viewerMissing}`
    : proofSeats.all.size < 2 ? 'no state lists any seat but the viewer\'s, so no other seat\'s hand was ever shown'
    : proofSeats.fewest < proofSeats.all.size ? `the state at line ${proofSeats.fewestLine} lists ${proofSeats.fewest} of the ${proofSeats.all.size} seats, so a hand is missing from it`
    : null;
  const opponentEmpty = !provable || seatsWhyNot !== null || emptyProof.opponentHand !== null || emptyProof.opponentListed !== null
    ? null
    : `every one of the ${stats.state} state bodies shows each other seat's hand at count 0 and their ` +
      `library.cards as [], and no frame lists a card in a hand or library the viewer does not own`;
  const opponentWhyNot = !emptyHandOk ? null
    : !provable ? 'no state body, or no numeric seat in the header'
    : seatsWhyNot !== null ? seatsWhyNot
    : emptyProof.opponentHand !== null ? `another seat's hand is not empty at line ${emptyProof.opponentHand}`
    : emptyProof.opponentListed !== null ? `a card of another seat's hand or library is listed at line ${emptyProof.opponentListed}`
    : null;
  const viewerEmpty = !provable || seatsWhyNot !== null || emptyProof.viewerHand !== null
    ? null
    : `every one of the ${stats.state} state bodies shows the viewer's own hand at count 0`;
  const viewerWhyNot = !emptyHandOk ? null
    : !provable ? 'no state body, or no numeric seat in the header'
    : seatsWhyNot !== null ? seatsWhyNot
    : emptyProof.viewerHand !== null ? `the viewer's hand is not empty at line ${emptyProof.viewerHand}`
    : null;
  const provesNothing = (msg, emptyWhy, whyNot) => {
    if (partial) {
      // A prefix of a healthy game has not had to redact or name anything yet:
      // the whole recording is held to this when it is finished (D440).
      skipped.push(msg);
    } else if (preGameOnly) {
      warn(lines.length, `${msg}. Every \`state\` in this file is turn 0, so no card was ever ` +
        `dealt: this is a pre-game session (a concede during the opening prompts), and the ` +
        `assertion is a WARN rather than a failure because there was nothing to conceal`);
    } else if (emptyWhy !== null) {
      warn(lines.length, `${msg}. --empty-hand-ok: ${emptyWhy}, so there was nothing to conceal ` +
        `and the assertion is a WARN (D460)`);
    } else {
      problems.push(`${path}: ${msg}${whyNot ? ` (--empty-hand-ok does not apply: ${whyNot})` : ''}`);
    }
  };
  if (stats.redacted === 0) {
    provesNothing('not one card was redacted -- either the opponent never held a card, or canBeShownTo is not being consulted', opponentEmpty, opponentWhyNot);
  }
  if (stats.viewerHandNamed === 0) {
    provesNothing('the viewer never saw a named card in their own hand -- the test proves nothing', viewerEmpty, viewerWhyNot);
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
  /*
   * M49's own rule: all or none, per FILE.  Not M6's block rule (that is about
   * several keys); one key that every recorder writes on every full card, so a
   * file where some full cards carry it and some do not is a Snap.card branch
   * that forgot it -- the null-state branch, which no fixture has ever reached.
   */
  stats.perFile = {};
  for (const [label, tally] of missed.perFile) {
    stats.perFile[label] = tally.present > 0 ? (tally.absent > 0 ? 'half' : 'present') : 'absent';
    if (tally.present > 0 && tally.absent > 0 && label !== 'M49 (keywords)') {
      problems.push(
        `${path}: ${label} is HALF PRESENT -- ${String(tally.present)} object(s) carry the key and ` +
        `${String(tally.absent)} do not (first: ${tally.firstAbsent}). A file written before the ` +
        `amendment, or by a recorder that does not write it, has NONE; a seat's emitter writes it ` +
        `on every one (docs/protocol.md).`);
    } else if (tally.present > 0 && tally.absent > 0) {
      problems.push(
        `${path}: M49's keywords are HALF PRESENT -- ${String(tally.present)} full card(s) carry ` +
        `"keywords" and ${String(tally.absent)} do not (first: ${tally.firstAbsent}). A recording ` +
        `older than M49 has NONE and is fine; an emitter that writes the key in one branch of ` +
        `Snap.card and not the other looks exactly like this (docs/protocol.md M49).`);
    }
  }
  stats.clientLog = isClientLog;
  stats.redelivered = redelivered;

  // --partial: how far the verdict reaches -- every byte before the first undecided line.
  let decidedBytes = stats.bytes;
  if (undecided.size > 0) {
    const first = Math.min(...undecided.keys());
    decidedBytes = lineStart[first - 1] ?? 0;
  }
  return { problems, warnings, stats, undecided: [...undecided.values()].flat(), skipped, decidedBytes };
}

// ----------------------------------------------------------------------
// M55 (D347): decision records.
//
// An AI seat's decisions -- its legal options and its answer -- are written into
// ITS OWN recording as `dir:"ai"` lines.  They are that seat's private
// information: `cast:41` says card 41 is in its hand and castable.  So:
//
//   D1  only in an AI-vs-AI recording (no `transport`, not a client log), and
//       every record's `seat` is the header's `seat` -- a record of another
//       seat is the opponent's options in this seat's file;
//   D2  exact key sets, no free text: tokens only (the coach bench's grammar),
//       numbers, and four enumerations (kind, by, source, why);
//   D3  the record points at a `state` frame earlier in the file (`frame`, its
//       index in frames[], and `stateSeq`, its seq), and every card id it names
//       is a card that frame -- or the next state frame -- shows the viewer
//       face up or as its own; never a stub's id, never a library card
//       (D481: or the viewer's own object no frame lists -- a token born onto
//       its battlefield whose latest zone event, as of the first state frame
//       after the decision, left it there or in its graveyard, or a card that
//       event moved from its own hand onto the stack -- counted; D485: or the
//       viewer's own token, born or listed as its own in the window, whose
//       latest move took it from its battlefield to its own graveyard or hand
//       -- a stale target, counted apart; D495: or a spell copy on the
//       stack, either seat's -- a `cast` event names it by the first state
//       after the decision that records an event, and no state lists it as a
//       stub or before that cast, every zone event moves it only among the
//       stack, battlefields, graveyards or nowhere, no `unstacked` took it off
//       before the decision -- counted apart);
//   D4  the answer is one of the options.

const DECISION_TOKEN = /^(pass|keep|mulligan|yes|no|option:hidden|target:none|(cast|land):\d+|(target|option):p?\d+|activate:\d+(#\d+)?|attack:(none|\d+(,\d+)*)|block:(none|\d+>\d+(,\d+>\d+)*))$/;
const DECISION_KINDS = ['priority', 'attack', 'block', 'target', 'choice', 'mulligan'];
const DECISION_BY = ['forge', 'outlets', 'search'];
// M75 / D486: 'modes', the target records of a modal spell whose modes the random seat drew inside the cast.
const DECISION_SOURCES = ['targets', 'trigger', 'chooseTargets', 'entity', 'cards', 'confirm', 'modes'];
const DECISION_KEYS = new Set(['seat', 'n', 'kind', 'frame', 'stateSeq', 'turn', 'phase', 'options', 'complete',
  'atoms', 'hidden', 'min', 'chosen', 'by', 'why', 'parent', 'source', 'search', 'explore']);
// M76 / D487: a targeting part left empty answers `target:none`, listed only when the record says the part's minimum
// (`min`) is 0 -- or, for a part whose minimum is 1 or more, beside `complete: false` and `why: "NO_TARGET"`.
const TARGET_NONE = 'target:none';
const NO_TARGET = 'NO_TARGET';

/**
 * M76 / D487: THE LEGACY SHAPE, J171 (2026-10-26, the first night on D486's seat).  Before D487 the bridge wrote a
 * targeting part Forge's own answer left empty as `chosen: null`; from D486 such a part lists its card candidates, so
 * it became a written record.  J171's five flagged spines hold 4,717 of them in 4,501 logs, every one `kind:
 * "target"`, `by: "forge"`, `source: "targets"`, no `min`, no `why`, no `target:none`: 4,616 the half of Tear
 * Asunder its kicker shut (TargetMin$ and TargetMax$ both 0) and 101 "up to" planeswalker abilities left empty
 * (TargetMin$ 0: Garruk, Curse Breaker's +2, The Wandering Emperor's +1, Minsc & Boo's +1).  D487 read each against
 * its cast's stack text: every empty part was the record's, and no cast carried a target outside its records'
 * options.  Accepted in exactly that shape, in a move-atlas log started before LEGACY_NULL_TARGET_BEFORE, and counted
 * (`M55 legacy null target records`); any other null answer --
 * another kind, source or policy, or a record that carries `min`, `why`, `complete`, `hidden`, `explore` or `search`,
 * or lists `target:none` -- still fails.
 */
// The bound (the D487 review): only a move-atlas log (`lab.atlas` in its header) started before this instant can carry
// the legacy shape.  J171's headers run from 2026-10-26T05:20Z to 11:52Z; the instant is that day's last J-night start
// plus a margin, about the hour D487 merges.  A log started later -- by any bridge -- that writes a null answer fails
// rather than passing as legacy; one started inside the margin by D487's bridge cannot write the shape (an empty part
// lists target:none and carries min, and an unseen answer is complete:false).
const LEGACY_NULL_TARGET_BEFORE = '2026-10-26T18:00:00Z';
function legacyNullTarget(b, header) {
  const started = Date.parse(header?.startedAt ?? '');
  return typeof header?.lab?.atlas === 'string' && Number.isFinite(started) && started < Date.parse(LEGACY_NULL_TARGET_BEFORE)
    && b.chosen === null && b.kind === 'target' && b.by === 'forge' && b.source === 'targets' && b.min === undefined
    && b.why === undefined && b.complete === undefined && b.hidden === undefined && b.explore === undefined
    && b.search === undefined && Array.isArray(b.options) && b.options.length > 1
    && b.options.every((t) => typeof t === 'string' && t !== TARGET_NONE && /^target:p?\d+$/.test(t));
}
// M57 / D358: a decision play exploration answered: the rule, and the seat's own answer as a token.
const EXPLORE_KEYS = new Set(['rule', 'forge']);
const EXPLORE_RULES = ['random', 'closeCall'];
const EXPLORE_SUMMARY_KEYS = new Set(['decisionsRandomised', 'changed', 'closeCalls', 'closeCallsChanged', 'coins', 'failures', 'byKind', 'guardrails']);
// M71 / D451, D458: the random seat's guardrail counts, by name (G1 land, G4 keep, G3 noRepeatNoOp, G5 refusedCast / noRepeatRefused);
// M73 / D471: G6's xDrawn / zeroXLeftOut and its violation zeroX.  D485: retargeted (a play cast after its stale
// targets were replaced) and staleRefused (Forge's answer not offered: its stale targets could not be made legal).
// M75 / D486: cardTargetOffered (a listing offered a play only a card target makes possible) and modesDrawn (a play
// cast with modes the seat drew in place of Forge's: at the listing, or inside the cast).
// M77 / D488: targetCountTrimmed and costTargetAvoided (a play cast with its targets fitted to its cost).
const GUARDRAIL_NAMES = ['land', 'keep', 'noRepeatNoOp', 'refusedCast', 'noRepeatRefused', 'xDrawn', 'zeroXLeftOut', 'zeroX',
  'retargeted', 'staleRefused', 'cardTargetOffered', 'modesDrawn', 'targetCountTrimmed', 'costTargetAvoided'];
const PLAY_EXPLORE_HEADER = { epsilon: 'number', closeCall: 'number', opening: 'boolean' };
const SEARCH_KEYS = new Set(['options', 'forge', 'best', 'rounds', 'playouts', 'ms', 'budgetMs', 'timedOut',
  'overrode', 'fallback', 'horizon', 'rule', 'margin', 'stat', 'z', 'generated']);
const SEARCH_OPTION_KEYS = new Set(['token', 'n', 'meanLeaf', 'se', 'diff', 'seDiff', 'win', 'prior']);
const SEARCH_RULES = ['margin', 'lcb'];
const SUMMARY_KEYS = new Set(['seat', 'written', 'searched', 'errors', 'recordMs', 'buildMs', 'byKind', 'byPolicy', 'forced', 'explore', 'guardrails']);
// M78 / D496: a `reveal` line -- what Forge's PlayerController.reveal showed the viewing seat: the ids, the zone
// they were revealed from, their owner.  Exactly these keys; no name, no engine string.
const REVEAL_KEYS = ['seat', 'cardIds', 'zone', 'owner'];
// The zone words: forge.game.zone.ZoneType's constants (the pinned 2.0.14 jar, javap), lowercased as Snap writes a zone.
const REVEAL_ZONES = ['hand', 'library', 'graveyard', 'battlefield', 'exile', 'flashback', 'command', 'stack', 'sideboard',
  'ante', 'merged', 'schemedeck', 'planardeck', 'attractiondeck', 'junkyard', 'contraptiondeck', 'subgame', 'extrahand', 'none'];
// M72 / D465: a Forge-piloted move-atlas branch seat's own guardrail count (its pay cap's passes), by name.
const FORGE_GUARDRAIL_NAMES = ['forgePayCap'];
const FALLBACKS = [null, 'budget', 'copyError', 'unmappable', 'rolloutErrors', 'invalidAtEnd'];

/** The card ids a state shows its viewer: full cards in every zone but a hidden one, and stackCards. */
function visibleIds(body, seat) {
  const ids = new Set();
  for (const p of body.players ?? []) {
    for (const [zname, z] of Object.entries(p.zones ?? {})) {
      if (zname === 'library' && p.id !== seat) continue;
      for (const c of z?.cards ?? []) {
        if (c && c.hidden !== true && typeof c.id === 'number') ids.add(c.id);
      }
    }
  }
  for (const c of body.stackCards ?? []) if (c && c.hidden !== true && typeof c.id === 'number') ids.add(c.id);
  return ids;
}

/** D481: a state's zone events, {cardId, from, to}, in order (the decision audit reads them back). */
function zoneMoves(body) {
  return (Array.isArray(body.events) ? body.events : [])
    .filter((e) => e?.kind === 'zone' && typeof e.cardId === 'number');
}

/**
 * D495: a state's stack events -- its `cast` events ({cardId, controller}) and
 * the ids its `unstacked` events take off the stack -- and whether it records
 * any event at all (a state the recorder flushed with nothing new is not an
 * engine step).
 */
function stackEvents(body) {
  const events = Array.isArray(body.events) ? body.events : [];
  return {
    casts: events.filter((e) => e?.kind === 'cast' && typeof e.cardId === 'number'),
    unstacked: new Set(events.filter((e) => e?.kind === 'unstacked' && typeof e.cardId === 'number').map((e) => e.cardId)),
    eventful: events.length > 0,
  };
}

/** D495: every id a state lists in any zone or in stackCards (`listed`), and those it lists as stubs (`stubs`). */
function listedIds(body) {
  const listed = new Set();
  const stubs = new Set();
  for (const c of [...(body.players ?? []).flatMap((p) => Object.values(p?.zones ?? {}).flatMap((z) => z?.cards ?? [])),
    ...(body.stackCards ?? [])]) {
    if (typeof c?.id !== 'number') continue;
    listed.add(c.id);
    if (c.hidden === true) stubs.add(c.id);
  }
  return { listed, stubs };
}

/**
 * D481: does a card's latest zone event put it where the viewer saw it as its
 * own?  Two shapes, and only these:
 *   - a TOKEN the viewer's own battlefield gave birth to (`born`: a zone event
 *     `from: null` onto the viewer's battlefield in the window), whose latest
 *     move left it on the viewer's own battlefield or in its own graveyard --
 *     both public, both the viewer's (`to.player` its seat);
 *   - a card moved onto the stack from the viewer's own HAND (`from` is the zone
 *     it left, so `from.player` says whose hand, i.e. who owns it; a stack zone
 *     event names no player).  Not from its own library or a face-down exile: the
 *     viewer could not see the card there when the option was offered.
 * Exile is never accepted (a card can go there face down), nor a card from or
 * into another seat's zones.
 */
function movedToViewersOwnPublicZone(e, seat, born) {
  if (!e?.to) return false;
  if (born && e.to.player === seat && (e.to.zone === 'battlefield' || e.to.zone === 'graveyard')) return true;
  return e.to.zone === 'stack' && e.from?.zone === 'hand' && e.from.player === seat;
}

/**
 * D485: the ids a state lists as the viewer's OWN tokens on its OWN battlefield
 * (`token: true`, controller and owner its seat) -- the vouching listing for a
 * token that predates the log and so has no birth event.
 */
function ownTokenIds(body, seat) {
  const ids = new Set();
  for (const p of body.players ?? []) {
    if (p.id !== seat) continue;
    for (const c of p.zones?.battlefield?.cards ?? []) {
      if (c && c.hidden !== true && c.token === true && c.controller === seat && c.owner === seat && typeof c.id === 'number') ids.add(c.id);
    }
  }
  return ids;
}

/**
 * D485: a STALE TARGET -- the viewer's own token that ceased to exist turns
 * before the decision and still sits in the target list Forge's AI left on a
 * play (J168: FightAi appends Troll Negotiations' "creature you control" target
 * at every evaluation).  Accepted only when the id is the viewer's own token
 * (`ownToken`: born onto its battlefield in the window, or listed by a state in
 * the window as its own token there) and its latest move took it from the
 * viewer's own battlefield into the viewer's own graveyard or hand, where a token
 * ceases to exist.  Exile, a library and any other seat's zone never.
 */
function ceasedFromViewersBattlefield(e, seat, ownToken) {
  return ownToken && e?.from?.zone === 'battlefield' && e.from.player === seat
    && (e.to?.zone === 'graveyard' || e.to?.zone === 'hand') && e.to.player === seat;
}

/** The card ids (not player ids) a token names. */
function tokenCardIds(t) {
  const m = /^[a-z]+:(.*)$/.exec(t);
  if (!m || m[1] === 'none' || m[1] === 'hidden') return [];
  return m[1].split(/[,>]/).filter((x) => !x.startsWith('p')).map((x) => Number(x.split('#')[0]));
}

function auditDecisions(aiLines, stateAt, stateOrder, header, isClientLog, stats = {}) {
  const out = [];
  const bad = (lineNo, msg, curable = false) => out.push({ lineNo, msg: `${msg} (M55, D347)`, curable });
  const seat = header.seat;
  const players = new Set((header.decks ?? []).map((d) => d?.player).filter((x) => typeof x === 'number'));
  const nextState = (idx) => stateOrder.find((k) => k > idx);
  let n = 0;
  // M78 / D496: what is wrong with a `reveal` body -- the ids Forge revealed to this seat, the zone, the owner,
  // and nothing else.  null zone or owner: Forge passed none (the vouching below reads neither).
  const revealProblems = (b) => {
    const out = [];
    for (const k of Object.keys(b)) if (!REVEAL_KEYS.includes(k)) out.push(`carries an unexpected key "${k}"`);
    for (const k of REVEAL_KEYS) if (!(k in b)) out.push(`has no "${k}"`);
    if (!Array.isArray(b.cardIds) || b.cardIds.length === 0 || !b.cardIds.every((x) => Number.isInteger(x) && x >= 0)) {
      out.push(`cardIds ${JSON.stringify(b.cardIds)?.slice(0, 80)} is not a non-empty list of card ids`);
    }
    if (b.zone !== null && !REVEAL_ZONES.includes(b.zone)) out.push(`zone ${JSON.stringify(b.zone)?.slice(0, 40)} is not a zone word`);
    if (b.owner !== null && !(Number.isInteger(b.owner) && (players.size === 0 || players.has(b.owner)))) {
      out.push(`owner ${JSON.stringify(b.owner)?.slice(0, 40)} is not a player of this game`);
    }
    return out;
  };
  // D496: every well-formed `reveal` line of this seat ({index, ids}), for the decision audit's window below.  The seat
  // filter is defence in depth and never changes a verdict: another seat's reveal line already fails the seat check
  // every `ai` line goes through, below.
  const reveals = aiLines.filter(({ f }) => f.type === 'reveal' && f.body?.seat === seat && revealProblems(f.body).length === 0)
    .map(({ f, index }) => ({ index, ids: new Set(f.body.cardIds) }));
  for (const { f, lineNo, index } of aiLines) {
    const b = f.body;
    if (header.transport !== undefined || isClientLog) {
      bad(lineNo, `a "dir":"ai" line in a seat recording (transport ${JSON.stringify(header.transport)}) -- decision ` +
        'records belong to AI-vs-AI recordings, each in the deciding seat\'s own log');
    }
    if (b.seat !== seat) {
      bad(lineNo, `a ${f.type} record of seat ${JSON.stringify(b.seat)} in seat ${seat}'s recording -- another ` +
        'seat\'s legal options and answers are ITS private information (they name its hand)');
      continue;
    }
    if (f.type === 'decisions') {
      for (const k of Object.keys(b)) if (!SUMMARY_KEYS.has(k)) bad(lineNo, `decisions summary carries an unexpected key "${k}"`);
      for (const k of ['byKind', 'byPolicy', 'forced']) {
        for (const [kk, v] of Object.entries(b[k] ?? {})) {
          if (!DECISION_KINDS.includes(kk) && !DECISION_BY.includes(kk)) bad(lineNo, `decisions summary ${k} key ${JSON.stringify(kk)}`);
          if (typeof v !== 'number') bad(lineNo, `decisions summary ${k}.${kk} is not a number`);
        }
      }
      if (b.guardrails !== undefined) {
        // M72 / D465: only a Forge-piloted atlas branch's seat (its header's lab block says continuation "forge"), never a random seat's
        if (header.lab?.continuation !== 'forge' || header.playExplore) bad(lineNo, 'decisions summary guardrails outside a Forge-piloted atlas branch\'s log (lab.continuation "forge"; M72, D465)');
        if (!plainObject(b.guardrails)) bad(lineNo, `decisions summary guardrails is not an object of counts: ${JSON.stringify(b.guardrails)?.slice(0, 80)} (M72)`);
        else for (const [kk, n] of Object.entries(b.guardrails)) {
          if (!FORGE_GUARDRAIL_NAMES.includes(kk) || !Number.isInteger(n) || n < 0) bad(lineNo, `decisions summary guardrails ${JSON.stringify(kk)}: ${JSON.stringify(n)} (M72)`);
        }
      }
      if (b.explore !== undefined) {
        if (!header.playExplore) bad(lineNo, 'decisions summary carries "explore" but the session header has no playExplore (M57, D358)');
        for (const [k, v] of Object.entries(b.explore ?? {})) {
          if (!EXPLORE_SUMMARY_KEYS.has(k)) bad(lineNo, `decisions summary explore carries an unexpected key "${k}"`);
          else if (k === 'guardrails') {
            if (!header.playExplore || header.playExplore.epsilon !== 1) bad(lineNo, 'decisions summary explore.guardrails outside a random seat\'s log (epsilon 1; M71, D451)');
            // D462 (the #177 review): an object of counts -- an array, a string or null would iterate as something else
            if (!plainObject(v)) bad(lineNo, `decisions summary explore.guardrails is not an object of counts: ${JSON.stringify(v)?.slice(0, 80)} (M71)`);
            else for (const [kk, n] of Object.entries(v)) {
              if (!GUARDRAIL_NAMES.includes(kk) || !Number.isInteger(n) || n < 0) bad(lineNo, `decisions summary explore.guardrails ${JSON.stringify(kk)}: ${JSON.stringify(n)} (M71)`);
            }
          } else if (k === 'byKind') {
            for (const [kk, n] of Object.entries(v ?? {})) {
              if (!DECISION_KINDS.includes(kk) || typeof n !== 'number') bad(lineNo, `decisions summary explore.byKind ${JSON.stringify(kk)}`);
            }
          } else if (typeof v !== 'number') bad(lineNo, `decisions summary explore.${k} is not a number`);
        }
      }
      continue;
    }
    if (f.type === 'reveal') {
      const problems = revealProblems(b);
      for (const m of problems) bad(lineNo, `reveal ${m} -- amendment M78, D496`);
      if (problems.length === 0) stats.reveals = (stats.reveals ?? 0) + 1;
      continue;
    }
    if (f.type !== 'decision') {
      bad(lineNo, `a "dir":"ai" line of type ${JSON.stringify(f.type)} -- only "decision", "decisions" and "reveal" exist`);
      continue;
    }
    for (const k of Object.keys(b)) if (!DECISION_KEYS.has(k)) bad(lineNo, `decision ${b.n} carries an unexpected key "${k}"`);
    if (b.n !== n) bad(lineNo, `decision n=${b.n}, expected ${n}`);
    n = (typeof b.n === 'number' ? b.n : n) + 1;
    if (!DECISION_KINDS.includes(b.kind)) bad(lineNo, `decision kind ${JSON.stringify(b.kind)}`);
    if (!DECISION_BY.includes(b.by)) bad(lineNo, `decision by ${JSON.stringify(b.by)}`);
    if (b.source !== undefined && !DECISION_SOURCES.includes(b.source)) bad(lineNo, `decision source ${JSON.stringify(b.source)}`);
    if (b.why !== undefined && !/^[A-Z_]+$/.test(String(b.why))) bad(lineNo, `decision why ${JSON.stringify(b.why)} is not a policy reason`);
    if (typeof b.phase !== 'string' || !/^[A-Z0-9_]+$/.test(b.phase)) bad(lineNo, `decision phase ${JSON.stringify(b.phase)}`);
    const tokens = [];
    const checkToken = (t, where) => {
      if (typeof t !== 'string' || !DECISION_TOKEN.test(t)) bad(lineNo, `decision ${b.n} ${where} ${JSON.stringify(t)} is not a token`);
      else tokens.push(t);
    };
    if (!Array.isArray(b.options) || b.options.length === 0) bad(lineNo, `decision ${b.n} has no options`);
    for (const t of b.options ?? []) checkToken(t, 'option');
    // M76 / D487: target:none, a targeting part left empty -- a target record's answer, listed beside its minimum.
    const listsNone = Array.isArray(b.options) && b.options.includes(TARGET_NONE);
    const chosesNone = b.chosen === TARGET_NONE || (Array.isArray(b.chosen) && b.chosen.includes(TARGET_NONE));
    if ((listsNone || chosesNone) && b.kind !== 'target') bad(lineNo, `decision ${b.n} (${b.kind}) names ${TARGET_NONE}, which only a target record answers (M76, D487)`);
    if (Array.isArray(b.chosen) && b.chosen.includes(TARGET_NONE)) bad(lineNo, `decision ${b.n} chose ${TARGET_NONE} among other targets (M76, D487)`);
    if (b.min !== undefined) {
      if (b.kind !== 'target' || !Number.isInteger(b.min) || b.min < 0) bad(lineNo, `decision ${b.n} min ${JSON.stringify(b.min)} -- a target record's part minimum, a non-negative integer (M76, D487)`);
      if (!listsNone) bad(lineNo, `decision ${b.n} carries min but does not list ${TARGET_NONE} (M76, D487)`);
    }
    if (listsNone && b.kind === 'target') {
      if (b.min === undefined) bad(lineNo, `decision ${b.n} lists ${TARGET_NONE} without the part's min (M76, D487)`);
      else if (Number.isInteger(b.min) && b.min > 0) {
        // a part whose minimum is 1 or more, left empty: an engine fault the record names, never an answer to list
        if (b.complete !== false || b.why !== NO_TARGET || b.chosen !== TARGET_NONE) {
          bad(lineNo, `decision ${b.n} lists ${TARGET_NONE} on a part whose minimum is ${b.min} -- only a part that ` +
            `may take no target lists it, or an empty mandatory part marked complete:false and why ${NO_TARGET} (M76, D487)`);
        } else stats.noTargetRecords = (stats.noTargetRecords ?? 0) + 1;
      }
    }
    if (b.why === NO_TARGET && !(listsNone && Number.isInteger(b.min) && b.min > 0)) bad(lineNo, `decision ${b.n} why ${NO_TARGET} on a record that is not an empty mandatory target part (M76, D487)`);
    if (legacyNullTarget(b, header)) {
      stats.legacyNullTargets = (stats.legacyNullTargets ?? 0) + 1;
    } else {
      const chosen = Array.isArray(b.chosen) ? b.chosen : [b.chosen];
      for (const t of chosen) {
        checkToken(t, 'chosen');
        if (!Array.isArray(b.chosen) && !(b.options ?? []).includes(t)) bad(lineNo, `decision ${b.n} chose ${JSON.stringify(t)}, which is not among its options`);
      }
    }
    for (const a of b.atoms ?? []) {
      if (typeof a !== 'string' || !/^\d+(>\d+)?$/.test(a)) bad(lineNo, `decision ${b.n} atom ${JSON.stringify(a)}`);
      else tokens.push(`atom:${a}`);
    }
    if (b.explore !== undefined) {
      // M57 / D358: only in a game played with exploration; the seat's own answer is a token like any other
      if (!header.playExplore) bad(lineNo, `decision ${b.n} carries an explore mark but the session header has no playExplore (M57, D358)`);
      const ex = b.explore;
      for (const k of Object.keys(ex ?? {})) if (!EXPLORE_KEYS.has(k)) bad(lineNo, `decision ${b.n} explore carries an unexpected key "${k}"`);
      if (!EXPLORE_RULES.includes(ex?.rule)) bad(lineNo, `decision ${b.n} explore rule ${JSON.stringify(ex?.rule)}`);
      if (ex?.forge !== null) checkToken(ex?.forge, 'explore forge');
    }
    if (b.search !== undefined) {
      const sb = b.search;
      for (const k of Object.keys(sb ?? {})) if (!SEARCH_KEYS.has(k)) bad(lineNo, `decision ${b.n} search carries an unexpected key "${k}"`);
      if (!FALLBACKS.includes(sb?.fallback)) bad(lineNo, `decision ${b.n} search fallback ${JSON.stringify(sb?.fallback)}`);
      if (sb?.rule !== undefined && !SEARCH_RULES.includes(sb.rule)) bad(lineNo, `decision ${b.n} search rule ${JSON.stringify(sb.rule)}`);
      if (sb?.generated !== undefined && !(Number.isInteger(sb.generated) && sb.generated > 0)) bad(lineNo, `decision ${b.n} search generated ${JSON.stringify(sb.generated)}`);
      for (const o of sb?.options ?? []) {
        for (const k of Object.keys(o)) if (!SEARCH_OPTION_KEYS.has(k)) bad(lineNo, `decision ${b.n} search option carries "${k}"`);
        checkToken(o.token, 'search option');
        for (const k of ['n', 'meanLeaf', 'se', 'diff', 'seDiff', 'win', 'prior']) if (o[k] !== undefined && o[k] !== null && typeof o[k] !== 'number') bad(lineNo, `decision ${b.n} search option ${k} is not a number`);
      }
    }
    // D3: the state it was taken in, and what that state shows the viewer.
    if (b.frame === null) {
      if (b.kind !== 'mulligan') bad(lineNo, `decision ${b.n} (${b.kind}) names no state frame`);
      continue;
    }
    const st = stateAt.get(b.frame);
    if (!st || b.frame >= index) {
      bad(lineNo, `decision ${b.n} points at frame ${b.frame}, which is not an earlier state frame`);
      continue;
    }
    if (st.seq !== b.stateSeq) bad(lineNo, `decision ${b.n} stateSeq ${b.stateSeq} but frame ${b.frame} is state seq ${st.seq}`);
    const nx = nextState(b.frame);
    const allowed = new Set([...st.ids, ...(nx !== undefined ? stateAt.get(nx).ids : [])]);
    /*
     * D481: ENTERED BETWEEN FRAMES.  The forwarder's clock snapshots state at its
     * boundaries, not inside a resolution, so an object can be where no state
     * frame lists it.  Minsc & Boo's upkeep trigger makes a new legendary Boo
     * token (or Springheart Nantuko a token copy of Zirda), the legend rule asks
     * which to keep (this decision), and the one let go is in the graveyard --
     * where a token ceases to exist -- before the next snapshot.  And a spell the
     * viewer cast while another was being cast (Tear Asunder, then Take It Back
     * targeting it) sits in the stack zone with no stack instance, so neither
     * `stackCards` nor a zone lists it.  The zone events record both: in the
     * state frames up to and including the first one after the decision (the
     * first with a greater seq), the id is a token born onto the viewer's own
     * battlefield whose latest move left it there or in the viewer's graveyard,
     * or a card whose latest move took it from the viewer's own hand onto the
     * stack.  Such an id is the viewer's own object in a public zone, so it is
     * counted and named, never a problem.  This LOOSENS D3's mechanical rule; the
     * bridge's own gate at decision time is Decisions.visible.  An id that never
     * appears, whose latest move is into another seat's zone, exile, a hand or a
     * library, or whose only move comes in a later state frame, still fails.
     * (J166, 2026-10-25: 1,891 ids in 1,395 legacy-spine logs, and one peasant
     * log's spell.)
     */
    /*
     * Two different "next" states, on purpose.  `allowed` (D3) is the state
     * after `b.frame`, the frame the decision names; the D481 window ends at
     * `after`, the first state after the decision's own LINE.  They are the same
     * frame whenever the decision names the latest state before it, which the
     * recorder always does; where they differ, the window is the later one.
     *
     * The window walks back to the FIRST state frame, not from `b.frame`: s02's
     * vouching event (Tear Asunder, hand -> stack) is at seq 323 and the
     * decision's state is 324.  Walking back is sound because every real zone
     * change fires GameEventCardChangeZone, which Snap writes as a zone event; the
     * changes that fire none leave the card public or end it (a token ceasing to
     * exist), so the latest move is where the card is.
     */
    const after = stateOrder.find((k) => k > index);
    const windowMoves = (id) => {
      const out = [];
      if (after === undefined) return out;
      for (let k = 0; k < stateOrder.length && stateOrder[k] <= after; k++) {
        for (const m of stateAt.get(stateOrder[k]).moves) if (m.cardId === id) out.push(m);
      }
      return out;
    };
    /*
     * D495: A SPELL COPY ON THE STACK.  A copy (replicate, storm, a Fork) is made
     * on the stack, not moved there: no zone list, no `stackCards` entry and no
     * zone event names it while it is a spell, and Forge's copy chooses its
     * targets BEFORE it is cast -- so the `cast` event that names it lands in a
     * state after the decision.  J176 s09: Lose Focus (48) with replicate, copies
     * 96 and 97; copy 97's target decision offers target:96 at state seq 338, and
     * seq 339 carries `cast` {cardId 96} and `cast` {cardId 97}; no state frame
     * of the log ever names either.  With three copies the recorder flushes an
     * EMPTY state before each copy's decision, so the window runs to the first
     * state after the decision that records any event (`copyEnd`, the engine's
     * next step), not merely the first state.
     *
     * Accepted, counted, when a `cast` event in the window (the first state
     * frame to `copyEnd`) names the id, by either seat -- the stack is public and
     * a copy has no hidden face and no hidden zone it came from -- and, over the
     * WHOLE log: no state lists it as a stub; no state before the one with its
     * cast lists it at all (it was a card in a zone, not a copy); every zone
     * event naming it goes from and to only the stack, a battlefield, a
     * graveyard or nowhere (a copy of a permanent spell resolves into a token);
     * and no `unstacked` event took it off the stack in or before the decision's
     * own state (a copy already gone).  The guards matter because a `cast`
     * event is not only a spell's: it fires for every stack object, abilities
     * included, and Snap writes its source card's id ungated -- so it can name a
     * hidden card (an ability activated from a hand).  What they keep out: a
     * hand card (a stub, or a zone event from a hand), a card shown in a zone
     * before its cast (a face-down exiled card), a library card (a zone event
     * from a library), anything that went to a hand, a library or exile, and a
     * copy already gone.
     */
    let copyEnd;
    for (const k of stateOrder) if (k > index && stateAt.get(k).eventful) { copyEnd = k; break; }
    const publicRef = (z) => z == null || z.zone === 'stack' || z.zone === 'battlefield' || z.zone === 'graveyard';
    const stackCopy = (id) => {
      if (copyEnd === undefined) return false;
      const castAt = stateOrder.find((k) => k <= copyEnd
        && stateAt.get(k).casts.some((e) => e.cardId === id && (players.size === 0 || players.has(e.controller))));
      if (castAt === undefined) return false;
      for (const k of stateOrder) {
        const s = stateAt.get(k);
        if (s.stubs.has(id) || (k < castAt && s.listed.has(id)) || (k <= b.frame && s.unstacked.has(id))) return false;
        if (s.moves.some((m) => m.cardId === id && !(publicRef(m.from) && publicRef(m.to)))) return false;
      }
      return true;
    };
    /*
     * D496: REVEALED TO THE SEAT, THEN MOVED WHERE THE SEAT SEES IT.  A decision
     * asked inside the resolution that revealed a card (a cascade:
     * DigUntilEffect reveals the dug cards to every player, exiles them, and the
     * Play effect asks "cast it without paying?") can name a state frame from
     * before the reveal, because the recorder holds a batch cut mid-update
     * (MidMove.hold, D352/D399): J177 s02's decision 15 offers option:59, the
     * seat's own library card, at state seq 57, and seq 58 moves 59 library ->
     * exile -> library.  Since M78 the seat's recorder writes the engine's own
     * `reveal` call where it happens.  Accepted, counted, only when ALL of:
     *   - a `reveal` line of this seat STRICTLY after the decision's state frame
     *     and STRICTLY before the decision names the id -- revealed since the
     *     last state frame written (not "in the same step": everything since that
     *     frame, a whole cast and its triggers, sits in the window, and a reveal
     *     with no event after it stays in it across later decisions);
     *   - a zone event in a state after the decision's state frame, up to and
     *     including the first state after the decision's line (`after`; held
     *     events ship with the first snapshot after the decision), moves the id
     *     INTO a zone the bridge's own gate, Decisions.visible, would name it in:
     *     a battlefield, a graveyard, the stack, the command zone, exile, or the
     *     viewer's own hand.  A reveal alone is not enough: the bridge never
     *     offers an opponent's hand card or a library card, whatever was revealed
     *     (a peek leaves the card where it was), so for a correct bridge a reveal
     *     matters only when the card then moved somewhere public;
     *   - neither the decision's state frame nor the state after it lists the id
     *     as a stub.
     * A reveal before the state frame does not vouch (a card still public then
     * would be in that state), nor one after the decision.
     *
     * What this cannot see: whether the ask came before or after the card hid
     * again (a revealed card can go back to a library or a hand inside the same
     * resolution, as 59 does).  The log does not order the ask against the
     * engine's moves inside a held batch; that remains the bridge's own gate at
     * decision time, Decisions.visible (D347), as for D481, D485 and D495.
     */
    const SEEN_ZONES = ['battlefield', 'graveyard', 'stack', 'command', 'exile'];
    const movedWhereSeen = (id) => after !== undefined && stateOrder.some((k) => k > b.frame && k <= after
      && stateAt.get(k).moves.some((m) => m.cardId === id && m.to
        && (SEEN_ZONES.includes(m.to.zone) || (m.to.zone === 'hand' && m.to.player === seat))));
    const stubNearby = (id) => st.stubs.has(id) || (nx !== undefined && stateAt.get(nx).stubs.has(id));
    const revealedThenSeen = (id) => reveals.some((r) => r.index > b.frame && r.index < index && r.ids.has(id))
      && movedWhereSeen(id) && !stubNearby(id);
    for (const t of tokens) {
      for (const id of tokenCardIds(t)) {
        const moves = allowed.has(id) ? [] : windowMoves(id);
        // The latest move with somewhere to go: a `to: null` event (a token ceasing to
        // exist, which Snap may write) falls back to the move before it, so the token
        // it ends is judged by the zone it was last in rather than failing.
        const latest = moves.filter((m) => m.to != null).at(-1);
        const born = moves.some((m) => m.from == null && m.to?.zone === 'battlefield' && m.to.player === seat);
        // D485: or shown as the viewer's own token by a state in the window (one older than the log has no birth)
        const ownToken = born || (!allowed.has(id) && after !== undefined
          && stateOrder.some((k) => k <= after && stateAt.get(k).ownTokens?.has(id)));
        if (!allowed.has(id) && movedToViewersOwnPublicZone(latest, seat, born)) {
          stats.enteredBetweenFrames = (stats.enteredBetweenFrames ?? 0) + 1;
        } else if (!allowed.has(id) && ceasedFromViewersBattlefield(latest, seat, ownToken)) {
          stats.ceasedToExist = (stats.ceasedToExist ?? 0) + 1;
        } else if (!allowed.has(id) && stackCopy(id)) {
          stats.stackCopies = (stats.stackCopies ?? 0) + 1;
        } else if (!allowed.has(id) && revealedThenSeen(id)) {
          stats.revealedThenSeen = (stats.revealedThenSeen ?? 0) + 1;
        } else if (!allowed.has(id)) {
          bad(lineNo, `decision ${b.n} names card ${id} (${t}), which its state frame does not show seat ${seat} -- ` +
            'a stub\'s id, a library card or another seat\'s hidden card is never an option',
            nx === undefined || copyEnd === undefined);   // D495: a prefix may not yet hold the copy's cast
        }
      }
      for (const m of t.matchAll(/p(\d+)/g)) {
        if (players.size > 0 && !players.has(Number(m[1]))) bad(lineNo, `decision ${b.n} names player ${m[1]}, not a player of this game`);
      }
    }
  }
  return out;
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

/** Run as a script (not imported by the self-test)? */
const isMain = (() => {
  try { return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();

function main() {
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
  /*
   * PARTIAL MODE (--partial, D440's served prefix: tools/watch-runner.mjs checks a
   * live game's log before it sends any of it).  A prefix of a healthy game is not
   * a whole game, so two kinds of complaint change and NOTHING ELSE does:
   *
   *   SKIPPED -- the three coverage checks, "no state frames at all", "not one
   *   card was redacted" and "the viewer never saw a named card".  They guard a
   *   green run over a recording with nothing hidden in it, and the first lines
   *   of every game (the header, hello_ok, the first states) meet none of them.
   *   They are named on a `skipped:` line; the finished recording is still
   *   checked whole, without the flag.
   *
   *   UNDECIDED -- the failures a line not yet written could cure: A4/A6 on the
   *   prefix's last frame when it is a `state` (the `ask` it was flushed for may
   *   be the next line: A6's one frame of slack), and an M55 decision naming a
   *   card when no later state frame is in the prefix yet (D3 allows the next
   *   one's).  They are not failures and not passes: `decided=<bytes>` stops at
   *   the first byte of the first such line, and a caller sends nothing past it.
   *
   * Every other assertion -- every leak rule (a stub with a sixth key or a
   * name, a named card in a hidden zone nothing revealed, an `alt` block on a
   * concealed face-down card, a yieldKey with a space or a `(`, a faceDownHidden
   * object, a library dumped as full cards, an engine string naming a concealed
   * card) and the exact-shape rules that make a leak visible at all ("a key this
   * script does not know about is a failure") -- fails a prefix exactly as it
   * fails a whole file.  A prefix of a healthy recording passes them: every
   * committed fixture, cut at every line, is held to that by
   * check-redaction-selftest.mjs.
   *
   * The exit code says which: 0 the prefix would pass a full check too; 3 no
   * failure in the decided part, but a coverage check was skipped or a tail is
   * undecided (read `decided=`); 1 a failure; 2 usage.
   */
  const partial = argv.includes('--partial');
  /**
   * --empty-hand-ok (D460, see the header): "not one card was redacted" and "the
   * viewer never saw a named card" become WARNs only where the file proves the
   * hand in question was empty in every state.  The atlas's branch logs only.
   */
  const emptyHandOk = argv.includes('--empty-hand-ok');
  const FLAGS = ['--pre-amendment', '--opponent-library-ok', '--client-log', '--partial', '--empty-hand-ok'];
  const files = argv.filter((a) => !a.startsWith('--'));
  const unknownFlag = argv.find((a) => a.startsWith('--') && !FLAGS.includes(a));
  if (unknownFlag !== undefined) {
    console.error(`unknown flag ${unknownFlag}`);
    process.exit(2);
  }
  if (files.length === 0) {
    console.error('usage: node tools/check-redaction.mjs [--pre-amendment] ' +
      '[--opponent-library-ok] [--client-log] [--partial] [--empty-hand-ok] <frames.jsonl> [...]');
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
    console.error('  --partial             the file is a PREFIX of a game still being written (the');
    console.error('                        watch runner\'s served check, D440): the three coverage');
    console.error('                        checks are skipped and a tail a later line could cure is');
    console.error('                        undecided; every leak rule still fails. Exit 0 a full');
    console.error('                        pass, 3 no failure but skipped/undecided (decided=<bytes>),');
    console.error('                        1 a failure.');
    console.error('  --empty-hand-ok       "not one card was redacted" / "the viewer never saw a named');
    console.error('                        card" are WARNs where the file proves that hand empty in');
    console.error('                        every state (count 0, no card listed anywhere; D460). For');
    console.error('                        the move atlas\'s branch logs. Every leak rule still fails.');
    process.exit(2);
  }
  if (preAmendment) {
    console.log('--pre-amendment: missing P1/P2/P3/P15 keys are WARNings, not failures');
  }
  if (opponentLibraryOk) {
    console.log('--opponent-library-ok: a non-viewer library.cards with content is a WARN, not a failure');
  }
  if (emptyHandOk) {
    console.log('--empty-hand-ok: "nothing redacted" / "no named card in the viewer\'s hand" are WARNs where the file proves that hand empty in every state');
  }

  let failed = 0;
  let short = 0;
  for (const path of files) {
    const { problems, warnings = [], stats, undecided = [], skipped = [], decidedBytes = 0 } = checkFile(path, { preAmendment, opponentLibraryOk, clientLog, partial, emptyHandOk });
    const ok = problems.length === 0;
    if (!ok) failed++;
    const whole = undecided.length === 0 && skipped.length === 0;
    if (ok && !whole) short++;
    console.log(`${ok ? (whole ? 'PASS' : 'PARTIAL') : 'FAIL'}  ${path}`);
    if (partial) {
      console.log(`      partial: decided=${ok ? decidedBytes : 0} of ${stats.bytes ?? 0} bytes`
        + `${undecided.length ? ` (${undecided.length} complaint(s) on a tail a later line may cure)` : ''}`);
      if (skipped.length) console.log(`      skipped (coverage, not a leak): ${skipped.join('; ')}`);
    }
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
      + `${stats.libraryRevealed}${stats.revealedTops ? ` (${stats.revealedTops} an opponent's top card revealed by a permanent, A3)` : ''}  alt blocks=${stats.altBlocks}${stats.altByLook ? ` (${stats.altByLook} an opponent's card exiled under a look permission, A9)` : ''}  tokens=${stats.tokens}  `
      + `asks=${stats.asks}  prompts scanned=${stats.promptsScanned}`
      + `${stats.damageRefusalsSeen ? `  assign_damage answers refused and re-asked=${stats.damageRefusalsSeen} (M67)` : ''}`
      + `${stats.answerRefusalsSeen ? `  answers refused and re-asked=${stats.answerRefusalsSeen} (M68)` : ''}`);
    console.log(`      A12 answers=${stats.answers} (kinds: `
      + `${[...(stats.answerKinds ?? [])].sort().join(', ') || 'none'}), value shape checked against `
      + `the matching ask.kind, unanswered asks=${stats.unanswered}`
      + `${stats.nullDefaults ? `, ${stats.nullDefaults} answered null on purpose (transport="null")` : ''}`);
    console.log(`      shape-checked ask bodies=${stats.askShapeChecks} (exact key set + declared `
      + `nullability, section 5.2)  notices=${stats.notices} (both strings swept and scanned, `
      + `section 6)  over frames=${stats.overs}`);
    // M44.  Printed either way, like the M6 line below: which files evidence the
    // match block, and which predate it (or are AI vs AI with no match setup).
    if (stats.hellos > 0) {
      console.log(stats.matchChecked > 0
        ? `      hello_ok.match checked on ${stats.matchChecked} of ${stats.hellos} hello_ok frame(s) `
          + `(exact key sets; aiDeck held to {name, cards}; cross-checked against the session header`
          + `${stats.yourProfileChecked > 0 ? `; yourProfile on an AI viewer, M47` : ''}`
          + `${stats.aiPolicyChecked > 0 ? `; aiPolicy a known policy, M56` : ''}`
          + `${stats.tableMatchChecked > 0 ? `; the two-person form, opponentDeck held to {name, cards}, M59` : ''})`
        : `      hello_ok.match absent from ${stats.hellos} hello_ok frame(s) (legitimate -- recorded `
          + `before amendment M44, or AI vs AI without a match setup; section 2.1)`);
    }
    if (stats.tables > 0) {
      console.log(`      table frames=${stats.tables} (exact key sets, amendment M59: presence, the decision clock, claimWin)`);
    }
    if (stats.enteredBetweenFrames > 0) {
      console.log(`      M55 decision ids entered between frames=${stats.enteredBetweenFrames} (D481: the viewer's own `
        + 'object in no state frame -- a token born onto its battlefield, last on its battlefield or in its graveyard, or a card moved from its own hand onto the stack)');
    }
    if (stats.ceasedToExist > 0) {
      console.log(`      M55 decision ids that ceased to exist=${stats.ceasedToExist} (D485: the viewer's own token, `
        + 'last moved from its battlefield to its own graveyard or hand, still named by a stale target list)');
    }
    if (stats.stackCopies > 0) {
      console.log(`      M55 decision ids that are spell copies on the stack=${stats.stackCopies} (D495: a copy cast in the `
        + 'window, in no zone before its cast, never a stub, moved only among the stack, battlefields, graveyards or nowhere, not yet off the stack)');
    }
    if (stats.revealedThenSeen > 0) {
      console.log(`      M55 decision ids revealed to the seat, then moved where it sees them=${stats.revealedThenSeen} (D496: a reveal line of the `
        + 'seat, after the decision\'s state frame and before the decision, names the id, and a zone event then moves it where the seat sees it)');
    }
    if (stats.reveals > 0) {
      console.log(`      M78 reveal lines=${stats.reveals} (D496: exact key set {seat, cardIds, zone, owner}, the seat's own)`);
    }
    if (stats.legacyNullTargets > 0) {
      console.log(`      M55 legacy null target records=${stats.legacyNullTargets} (D487: J171's shape, written before M76 -- `
        + 'Forge\'s answer left a targeting part empty and the record said null; target/forge/targets, card candidates, no min)');
    }
    if (stats.noTargetRecords > 0) {
      console.log(`      M76 empty mandatory target parts=${stats.noTargetRecords} (D487: target:none on a part whose minimum `
        + 'is 1 or more, marked complete:false and NO_TARGET -- the play will fail to target)');
    }
    // M49.  Whether this file carries the status layer's keywords -- on every
    // full card, or (a recording older than M49) on none.
    const kw = stats.perFile?.['M49 (keywords)'];
    if (kw !== undefined) {
      console.log(kw === 'present'
        ? '      M49 keywords present on every full card (Keyword constants only, [] when face down)'
        : kw === 'absent'
          ? '      M49 keywords absent from every full card (legitimate -- recorded before amendment M49)'
          : '      M49 keywords HALF PRESENT (a failure, above)');
    }
    // M61.  Whether this file carries state.playable -- on every frame, or on none.
    const pl = stats.perFile?.['M61 (playable)'];
    if (pl !== undefined) {
      console.log(pl === 'present'
        ? `      M61 playable present on every state (${String(stats.playable ?? 0)} entries, each the seat's own full card)`
        : pl === 'absent'
          ? '      M61 playable absent (legitimate -- recorded before amendment M61, or no seat)'
          : '      M61 playable HALF PRESENT (a failure, above)');
    }
    // M63.  The same for state.activatable.
    const ac = stats.perFile?.['M63 (activatable)'];
    if (ac !== undefined) {
      console.log(ac === 'present'
        ? `      M63 activatable present on every state (${String(stats.activatable ?? 0)} entries, each a permanent the seat controls)`
        : ac === 'absent'
          ? '      M63 activatable absent (legitimate -- recorded before amendment M63, or no seat)'
          : '      M63 activatable HALF PRESENT (a failure, above)');
    }
    // M65 / M66.  Whether this file's inputs carry selectable.chosen / playerIds.
    for (const [label, n, what] of [['M66 (playerIds)', stats.selPlayers, 'a list'], ['M65 (chosen)', stats.selChosen, 'an object']]) {
      const v = stats.perFile?.[label];
      if (v === undefined) continue;
      console.log(v === 'present'
        ? `      ${label} present on every input (${String(n ?? 0)} carrying ${what}, the rest null)`
        : v === 'absent'
          ? `      ${label} absent (legitimate -- recorded before the amendment, or no input)`
          : `      ${label} HALF PRESENT (a failure, above)`);
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
  process.exit(failed > 0 ? 1 : short > 0 ? 3 : 0);
}

if (isMain) main();
