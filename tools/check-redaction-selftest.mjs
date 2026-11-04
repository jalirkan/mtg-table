#!/usr/bin/env node
/*
 * mtg-table -- tools/check-redaction-selftest.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The negative control for tools/check-redaction.mjs: runs it over
 * fixtures/negative/redaction/ and asserts that every one-defect probe FAILS,
 * for the right reason, and that the undefected baseline PASSES.
 *
 *   node tools/check-redaction-selftest.mjs
 *
 * Its flag sections hold each of the checker's flags to its one relaxation:
 * --pre-amendment, --opponent-library-ok, --partial and --empty-hand-ok (D460,
 * whose controls are variants of the baseline built here, not files).
 *
 * It exists because the checker's own regression is invisible by construction.
 * For one afternoon check-redaction.mjs downgraded the absence of `owner`,
 * `token`, `alt` and `library.cards` to a per-file WARN, so five probes that
 * reverted four amendments all PASSED and check-all.sh exited 0. A green run of
 * a checker that cannot fail is worth nothing, and nothing in the repo was
 * testing THIS file until now.
 *
 * Regenerate the corpus with tools/make-negative-fixtures.mjs when the card
 * shape changes. If the baseline starts failing, that is the signal.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const DIR = 'fixtures/negative/redaction';
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8'));

/** Run the checker on one file; returns {code, out}. */
function check(file, flags = []) {
  const r = spawnSync(process.execPath, ['tools/check-redaction.mjs', ...flags, `${DIR}/${file}`],
    { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

let failures = 0;
const bad = (msg) => { failures += 1; console.log(`  FAIL  ${msg}`); };

console.log(`check-redaction self-test: ${manifest.length} controls in ${DIR}/`);

// The manifest is generated, so a regeneration from an older copy of
// tools/make-negative-fixtures.mjs could drop a probe and every remaining one
// would still pass. These are named here as well, so losing one is a failure
// rather than a shorter list. Amendment M44's `hello_ok.match` audit is a
// hidden-information assertion (the AI's deck is {name, cards} and nothing
// else) and is optional-when-absent, which is exactly the kind of check a later
// edit could switch off without a single committed recording noticing.
const REQUIRED = [
  ['m44-match-present.jsonl', 'pass'],
  ['m44-aideck-carries-path.jsonl', 'fail'],
  ['m44-aideck-cards-is-a-list.jsonl', 'fail'],
  ['m44-yourdeck-path-mismatch.jsonl', 'fail'],
  // Amendment M47 (spectating): the viewer's own profile, only on an AI viewer,
  // and the paced header's one key.
  ['m47-spectated-present.jsonl', 'pass'],
  // Amendment M60 (D406, D407): a best of three at a table of two, and a seat's consent.
  ['m60-best-of-three-present.jsonl', 'pass'],
  ['m60-score-in-a-one-game-match.jsonl', 'fail'],
  ['m60-score-not-a-count.jsonl', 'fail'],
  ['m60-score-ahead-of-the-game.jsonl', 'fail'],
  ['m60-record-not-a-boolean.jsonl', 'fail'],
  ['m60-record-against-the-ai.jsonl', 'fail'],
  // Amendment M62 (D414): the session header's ai, the search's knobs only, on a seat's log only.
  ['m62-ai-unexpected-key.jsonl', 'fail'],
  ['m62-ai-without-transport.jsonl', 'fail'],
  ['m47-yourprofile-on-a-human-seat.jsonl', 'fail'],
  ['m47-yourprofile-is-a-path.jsonl', 'fail'],
  ['m47-pace-not-a-number.jsonl', 'fail'],
  // Amendment M56: the AI seat's policy, one word of a fixed set.
  ['m56-aipolicy-present.jsonl', 'pass'],
  ['m56-aipolicy-not-a-policy.jsonl', 'fail'],
  // Amendment M49 (the status layer): a full card's keywords -- constants only,
  // [] when face down, never on a stub, and on every full card or none.
  ['m49-keywords-present.jsonl', 'pass'],
  ['m49-stub-carries-keywords.jsonl', 'fail'],
  ['m49-keyword-is-a-display-string.jsonl', 'fail'],
  ['m49-face-down-carries-keywords.jsonl', 'fail'],
  ['m49-keywords-half-present.jsonl', 'fail'],
  // D315: a revealed library top (Courser of Kruphix) is public; two cards, or a
  // private "may look" (Experimental Frenzy), are not.
  ['a3-revealed-top-under-courser.jsonl', 'pass'],
  ['a3-revealed-top-two-cards.jsonl', 'fail'],
  ['a3-revealed-top-look-is-private.jsonl', 'fail'],
  // D371 (A9): an opponent's face-down card in exile may show its face to the
  // seat whose effect dug it there with a look permission (Gonti, Thief of
  // Sanity) -- and in no other shape; in play, the face is the controller's.
  ['a9-look-permission-under-gonti.jsonl', 'pass'],
  ['a9-exiled-face-down-named-without-a-dig.jsonl', 'fail'],
  ['a9-dig-by-the-opponent.jsonl', 'fail'],
  ['a9-alt-appears-after-the-dig.jsonl', 'fail'],
  ['a9-opponent-morph-named.jsonl', 'fail'],
  ['a9-stolen-morph-named-for-its-owner.jsonl', 'fail'],
  // D502 (J182 s06): hideaway's look is granted to the current controller of the
  // permanent that exiled the card -- an opponent's face-down card dug from their
  // library into exile beside a permanent's entry may show its face from the
  // state in which (or the one after which) the viewer took that permanent, and
  // (D505, J183 s11) for as long as it stays in exile, whoever holds the
  // permanent afterwards.  The probes: no change of control, control from the
  // start, the viewer's own permanent, a third owner's, outside exile, the alt
  // two states late, a foretold card and a hand card under an unrelated steal
  // (the review of f3a3091b), and a card of another hideaway host.
  ['a9-hideaway-control-taken.jsonl', 'pass'],
  ['a9-hideaway-alt-a-state-after-control-taken.jsonl', 'pass'],
  ['a9-hideaway-alt-a-state-after-the-host-leaves.jsonl', 'pass'],
  ['a9-hideaway-no-control-change.jsonl', 'fail'],
  ['a9-hideaway-viewer-controlled-from-the-start.jsonl', 'fail'],
  ['a9-hideaway-viewer-own-permanent-taken-back.jsonl', 'pass'],   // D512: was 'fail' (D502's theory, J187's engine evidence)
  ['a9-hideaway-third-party-permanent.jsonl', 'fail'],
  ['a9-hideaway-alt-in-a-graveyard.jsonl', 'fail'],
  ['a9-hideaway-alt-two-states-after-control-taken.jsonl', 'fail'],
  ['a9-hideaway-foretold-card-under-a-stolen-creature.jsonl', 'fail'],
  ['a9-hideaway-hand-card-exiled-with-its-alt-at-the-steal.jsonl', 'fail'],
  ['a9-hideaway-alt-kept-after-control-returns.jsonl', 'pass'],
  ['a9-hideaway-alt-after-control-already-returned.jsonl', 'fail'],
  ['a9-hideaway-card-re-exiled-from-a-hand.jsonl', 'fail'],
  ['a9-hideaway-dug-from-another-library.jsonl', 'fail'],
  ['a9-hideaway-dug-into-another-exile.jsonl', 'fail'],
  ['a9-hideaway-card-of-an-unrelated-host.jsonl', 'fail'],
  // the second review (c12f8418): the log's first frame is no entry, the dig needs
  // its host's hideaway trigger, and a host vouches for one dig only
  ['a9-hideaway-retaken-the-frame-after-a-return.jsonl', 'pass'],
  ['a9-hideaway-alt-dropped-while-returned.jsonl', 'pass'],
  ['a9-hideaway-dig-with-no-host-trigger.jsonl', 'fail'],
  ['a9-hideaway-dig-beside-the-log-start.jsonl', 'fail'],
  ['a9-hideaway-dig-beside-a-later-trigger-of-the-host.jsonl', 'fail'],
  ['a9-hideaway-lag-frame-then-an-unrelated-steal.jsonl', 'fail'],
  ['a9-hideaway-lag-frame-then-a-steal-of-an-earlier-entry.jsonl', 'fail'],
  ['a9-hideaway-unrelated-dig-after-an-entry-with-no-trigger.jsonl', 'fail'],
  ['a9-hideaway-second-dig-beside-the-host-trigger.jsonl', 'fail'],
  ['a9-hideaway-two-hosts-enter-together.jsonl', 'fail'],
  // the third review (50b92814): a creature spell's cast is no trigger, ties count
  // every dig, a held grant ends on any move; and the one admitted residual
  ['a9-hideaway-creature-spell-cast-then-unrelated-dig.jsonl', 'fail'],
  ['a9-hideaway-real-card-played-then-steal.jsonl', 'fail'],
  ['a9-hideaway-held-grant-card-re-dug-in-one-frame.jsonl', 'fail'],
  ['a9-hideaway-held-grant-card-through-a-hand.jsonl', 'fail'],
  ['a9-hideaway-card-re-dug-under-a-new-host.jsonl', 'pass'],
  ['a9-hideaway-residual-trigger-digs-nothing-another-dig-next.jsonl', 'pass'],
  // D505 (J183 s11): a grant is kept after control returns and after its host
  // leaves the battlefield; a move, a gap in the alt or no take still fail
  ['a9-hideaway-alt-kept-while-returned-then-retaken.jsonl', 'pass'],
  ['a9-hideaway-alt-kept-after-the-host-leaves.jsonl', 'pass'],
  ['a9-hideaway-alt-again-after-the-card-moved.jsonl', 'fail'],
  ['a9-hideaway-kept-grant-card-through-a-hand.jsonl', 'fail'],
  ['a9-hideaway-alt-after-the-host-left-never-taken.jsonl', 'fail'],
  ['a9-hideaway-alt-back-after-a-gap-without-a-retake.jsonl', 'fail'],
  // D505's second part: the dig timed from its trigger's resolution, one dig per entry
  ['a9-hideaway-dig-two-frames-after-the-entry.jsonl', 'pass'],
  ['a9-hideaway-dig-three-frames-after-the-entry.jsonl', 'pass'],
  ['a9-hideaway-dig-a-frame-before-its-resolution.jsonl', 'pass'],
  ['a9-hideaway-flickered-host-two-cards.jsonl', 'pass'],
  ['a9-hideaway-dig-with-no-resolution.jsonl', 'fail'],
  ['a9-hideaway-two-digs-tied-to-one-entry.jsonl', 'fail'],
  ['a9-hideaway-dig-after-the-resolution.jsonl', 'fail'],
  ['a9-hideaway-dig-after-the-resolution-in-one-frame.jsonl', 'fail'],
  ['a9-hideaway-dig-before-the-trigger-cast.jsonl', 'fail'],
  // the review of f5fcf747: a countered trigger closes, a fizzled one digs nothing, a bounded wait
  ['a9-hideaway-countered-trigger-then-an-activation.jsonl', 'fail'],
  ['a9-hideaway-countered-trigger-take-much-later.jsonl', 'fail'],
  ['a9-hideaway-countered-first-entry-then-a-flicker.jsonl', 'fail'],
  ['a9-hideaway-countered-first-entry-flicker-card-only.jsonl', 'pass'],
  ['a9-hideaway-countered-trigger-host-dies-and-returns.jsonl', 'fail'],
  ['a9-hideaway-activation-the-frame-after-the-entry-resolved-late.jsonl', 'fail'],
  ['a9-hideaway-resolution-eleven-frames-after-the-cast.jsonl', 'fail'],
  ['a9-hideaway-resolution-ten-frames-after-the-cast.jsonl', 'pass'],
  ['a9-hideaway-cast-the-frame-after-the-entry-resolved-three-later.jsonl', 'pass'],
  ['a9-hideaway-fizzled-trigger.jsonl', 'fail'],
  ['a9-hideaway-two-hosts-the-first-resolver-taken.jsonl', 'pass'],
  ['a9-hideaway-resolved-and-unstacked-straddle-a-snapshot.jsonl', 'pass'],
  // D512 (J187 s06): the host's owner is irrelevant -- the viewer takes it FROM
  // the player whose library the card was dug from, by that player's trigger --
  // and the alt may lead the listed take by one frame while the viewer's aura
  // attaching to the host resolves (d21), decided by the next state frame.
  ['a9-hideaway-own-permanent-reanimated-by-the-opponent-taken-back.jsonl', 'pass'],
  ['a9-hideaway-alt-a-frame-before-the-take-while-the-aura-resolves.jsonl', 'pass'],
  ['a9-hideaway-alt-a-frame-before-the-opponent-own-watcher-taken.jsonl', 'pass'],
  ['a9-hideaway-own-permanent-taken-back-from-a-third-party.jsonl', 'fail'],
  ['a9-hideaway-own-permanent-unrelated-dig-beside-the-viewer-trigger.jsonl', 'fail'],
  ['a9-hideaway-alt-two-frames-before-the-take.jsonl', 'fail'],
  ['a9-hideaway-alt-before-a-take-that-never-comes.jsonl', 'fail'],
  ['a9-hideaway-alt-before-a-take-the-log-ends-first.jsonl', 'fail'],
  ['a9-hideaway-alt-ahead-of-the-take-with-no-attach.jsonl', 'fail'],
  ['a9-hideaway-alt-ahead-of-the-take-the-opponent-aura.jsonl', 'fail'],
  ['a9-hideaway-alt-ahead-of-the-take-aura-onto-another-permanent.jsonl', 'fail'],
  ['a9-hideaway-alt-ahead-of-the-take-another-host-taken.jsonl', 'fail'],
  // ... and the opposite direction: the viewer's own hand served as a stub.
  ['own-hand-card-redacted.jsonl', 'fail'],
  // Amendment M55 (D347): an AI seat's decision records, in its own log only;
  // the planted leaks are another seat's record and an option naming a card
  // the viewer cannot see.
  ['m55-decisions-present.jsonl', 'pass'],
  ['m55-decision-of-the-other-seat.jsonl', 'fail'],
  ['m55-option-names-the-opponent-hand.jsonl', 'fail'],
  ['m55-decision-carries-a-label.jsonl', 'fail'],
  ['m55-chosen-is-not-an-option.jsonl', 'fail'],
  ['m55-frame-is-not-a-state.jsonl', 'fail'],
  ['m55-decision-in-a-seat-recording.jsonl', 'fail'],
  // D481: a token made and gone between two state frames (also one that then
  // ceased to exist), and the viewer's own spell on the stack with no stack
  // instance (its event in, or a frame before, the decision's state frame), each
  // vouched for by its latest zone event.  The controls: no events, the
  // opponent's hand, a spell from the opponent's hand or the viewer's library, a
  // token born onto the opponent's battlefield (or born there and then taken),
  // one taken by the opponent or exiled, a card never born, a latest move into
  // the opponent's hand, and events one state too late.
  ['m55-option-entered-between-frames.jsonl', 'pass'],
  ['m55-option-never-shown.jsonl', 'fail'],
  ['m55-option-entered-the-opponent-hand.jsonl', 'fail'],
  ['m55-option-entered-a-state-too-late.jsonl', 'fail'],
  ['m55-option-cast-between-frames.jsonl', 'pass'],
  ['m55-option-cast-from-the-opponent-hand.jsonl', 'fail'],
  ['m55-option-entered-then-went-to-the-opponent-hand.jsonl', 'fail'],
  ['m55-option-cast-a-frame-before-the-decision.jsonl', 'pass'],
  ['m55-option-entered-then-ceased-to-exist.jsonl', 'pass'],
  ['m55-option-born-on-the-opponent-battlefield.jsonl', 'fail'],
  ['m55-option-born-then-taken-by-the-opponent.jsonl', 'fail'],
  ['m55-option-born-on-the-opponent-then-taken.jsonl', 'fail'],
  ['m55-option-entered-the-viewer-exile.jsonl', 'fail'],
  ['m55-option-cast-from-the-viewer-library.jsonl', 'fail'],
  ['m55-option-not-born-in-the-graveyard.jsonl', 'fail'],
  // D485: a stale target -- the viewer's own token, gone turns before, still in a
  // target list Forge's AI left on a play (J168).  Vouched for when a state in the
  // window lists it as the viewer's own token (or it was born there) and its
  // latest move took it from the viewer's battlefield to the viewer's own
  // graveyard or hand.  The controls: the opponent's hand, the opponent's token,
  // exile, a nontoken card, and a listing that comes only after the window.
  ['stale-token-died-earlier.jsonl', 'pass'],
  ['stale-token-bounced-to-own-hand.jsonl', 'pass'],
  ['stale-token-bounced-to-the-opponent-hand.jsonl', 'fail'],
  ['stale-token-of-the-opponent.jsonl', 'pass'],   // a FAIL control until D503
  ['stale-token-then-exiled.jsonl', 'fail'],
  ['stale-nontoken-ghost.jsonl', 'fail'],
  ['stale-token-shown-only-after-the-window.jsonl', 'fail'],
  // D503 (J182 s10): another seat's token that ceased to exist -- listed as that
  // seat's own token on its battlefield in the window, its latest move from there
  // into that seat's own graveyard or hand (or nowhere), never a stub nearby.  The
  // controls: a nontoken card (listed nowhere after, or a stub at the decision), a
  // token never listed, exile, a library, a token still a stub in its owner's hand.
  ['ceased-opponent-token-source-choice.jsonl', 'pass'],
  ['ceased-opponent-token-bounced-to-its-hand.jsonl', 'pass'],
  ['ceased-opponent-token-to-nowhere.jsonl', 'pass'],
  ['ceased-opponent-nontoken-ghost.jsonl', 'fail'],
  ['ceased-opponent-nontoken-a-stub.jsonl', 'fail'],
  ['ceased-opponent-token-never-listed.jsonl', 'fail'],
  ['ceased-opponent-token-then-exiled.jsonl', 'fail'],
  ['ceased-opponent-token-into-a-library.jsonl', 'fail'],
  ['ceased-opponent-token-shown-only-after-the-window.jsonl', 'fail'],
  ['ceased-opponent-token-into-the-viewer-hand.jsonl', 'fail'],
  ['ceased-opponent-token-exiled-then-to-graveyard.jsonl', 'fail'],
  ['ceased-opponent-token-exiled-then-gone.jsonl', 'fail'],
  ['ceased-opponent-token-still-a-hand-stub.jsonl', 'fail'],
  // D495: a spell copy on the stack -- never in a zone, its `cast` event after the
  // decision -- vouched for by a cast in the window by either seat (the stack is
  // public), and one that resolves into a token.  The controls: a cast too late,
  // a later move into the opponent's hand, an opponent's cast naming its own hand
  // stub (and the same in the log's first state: guard 2 alone), a face-down
  // exiled card listed before its cast (guard 3 alone), a card cast from a
  // library, a copy already gone (no cast at all is m55-option-never-shown).
  ['stack-copy-cast-by-the-viewer.jsonl', 'pass'],
  ['stack-copy-cast-by-the-opponent.jsonl', 'pass'],
  ['stack-copy-cast-after-empty-states.jsonl', 'pass'],
  ['stack-copy-resolves-into-a-token.jsonl', 'pass'],
  ['stack-copy-cast-a-step-too-late.jsonl', 'fail'],
  ['stack-copy-then-into-the-opponent-hand.jsonl', 'fail'],
  ['stack-copy-is-an-opponent-hand-stub.jsonl', 'fail'],
  ['stack-copy-is-a-card-from-a-library.jsonl', 'fail'],
  ['stack-copy-hand-stub-cast-in-the-first-state.jsonl', 'fail'],
  ['stack-copy-face-down-exile-listed-before-its-cast.jsonl', 'fail'],
  ['stack-copy-already-off-the-stack.jsonl', 'fail'],
  // D496 (M78): a `reveal` line of the seat, after the decision's state frame and
  // before the decision, vouches for the ids it names when a zone event then moves
  // the id where the seat sees it (a cascade's card) and no nearby state lists it
  // as a stub.  The controls: a reveal before the state frame, after the decision,
  // of another id, of another seat, with a fifth key, with no ids, with a card name
  // for a zone, with an owner who is no player; an opponent's hand stub; a peek;
  // a move one state too late.
  ['reveal-vouches-the-option.jsonl', 'pass'],
  ['reveal-before-the-decision-state.jsonl', 'fail'],
  ['reveal-after-the-decision.jsonl', 'fail'],
  ['reveal-names-another-id.jsonl', 'fail'],
  ['reveal-of-another-seat.jsonl', 'fail'],
  ['reveal-with-an-unexpected-key.jsonl', 'fail'],
  ['reveal-empty-card-ids.jsonl', 'fail'],
  ['reveal-zone-not-a-zone-word.jsonl', 'fail'],
  ['reveal-owner-not-a-player.jsonl', 'fail'],
  ['reveal-of-an-opponent-hand-stub.jsonl', 'fail'],
  ['reveal-moved-a-state-too-late.jsonl', 'fail'],
  ['reveal-of-a-peeked-library-card-that-never-moves.jsonl', 'fail'],
  // D504 (J182 s04): an opponent's cast, entered between frames -- a stub of
  // another seat's hand in the decision's state, moved from that hand onto the
  // stack and cast in the window (a held batch).  The controls: into a library
  // or exile with no cast, onto the stack with no cast, still a stub after the
  // decision, the move and cast a state too late (and D481's
  // m55-option-cast-from-the-opponent-hand: no stub, no cast).
  ['m55-option-cast-from-the-opponent-hand-held.jsonl', 'pass'],
  ['m55-option-opponent-hand-to-library-no-cast.jsonl', 'fail'],
  ['m55-option-opponent-hand-to-exile-no-cast.jsonl', 'fail'],
  ['m55-option-opponent-hand-to-stack-no-cast.jsonl', 'fail'],
  ['m55-option-opponent-cast-still-a-stub-after.jsonl', 'fail'],
  ['m55-option-opponent-hand-to-exile-with-a-cast.jsonl', 'fail'],
  ['m55-option-opponent-cast-from-another-zone.jsonl', 'fail'],
  ['m55-option-opponent-cast-never-a-stub.jsonl', 'fail'],
  ['m55-option-opponent-cast-event-a-state-too-late.jsonl', 'fail'],
  ['m55-option-opponent-cast-a-state-too-late.jsonl', 'fail'],
  // Amendment M57 (D358): play exploration's header and decision marks; the
  // planted leak is a mark whose Forge answer names the opponent's hand card.
  ['m57-explore-present.jsonl', 'pass'],
  ['m57-explore-without-header.jsonl', 'fail'],
  ['m57-explore-forge-names-the-opponent-hand.jsonl', 'fail'],
  ['m57-explore-carries-a-label.jsonl', 'fail'],
  ['m57-playexplore-in-a-seat-recording.jsonl', 'fail'],
  // Amendment M76 (D487): a targeting part left empty answers target:none, listed beside the part's min (0; or 1+
  // only marked complete:false and NO_TARGET); J171's legacy null answer passes in its one shape, counted.
  ['m76-target-none-listed.jsonl', 'pass'],
  ['m76-target-none-mandatory-part.jsonl', 'pass'],
  ['m76-legacy-null-target.jsonl', 'pass'],
  ['m76-chosen-null-beside-target-none.jsonl', 'fail'],
  ['m76-chosen-null-trigger.jsonl', 'fail'],
  ['m76-target-none-not-listed.jsonl', 'fail'],
  ['m76-target-none-on-a-min-1-part.jsonl', 'fail'],
  ['m76-target-none-without-min.jsonl', 'fail'],
  ['m76-target-none-on-a-priority-record.jsonl', 'fail'],
  // the D487 review: the legacy shape bounded to a move-atlas log started before D487 merged, one marker off it at a
  // time, an answer the seat cannot see, and the rest of the M76 rules
  ['m76-legacy-null-target-after-d487.jsonl', 'fail'],
  ['m76-legacy-null-target-not-an-atlas.jsonl', 'fail'],
  ['m76-unseen-answer-null.jsonl', 'fail'],
  ['m76-legacy-null-by-search.jsonl', 'fail'],
  ['m76-legacy-null-source-modes.jsonl', 'fail'],
  ['m76-target-none-in-a-chosen-list.jsonl', 'fail'],
  ['m76-min-without-target-none.jsonl', 'fail'],
  ['m76-min-negative.jsonl', 'fail'],
  ['m76-min-not-an-integer.jsonl', 'fail'],
  ['m76-no-target-elsewhere.jsonl', 'fail'],
  // Amendment M81 (D510): a target record lists a candidate the seat cannot see as option:hidden and answers an unseen
  // target with it -- alone (J186's all-hidden part) and in a chosen list beside a visible target.  No rule of its own
  // (option:hidden is a token for every kind); this control fails if a token-per-kind rule ever forgets the target path.
  ['m81-target-option-hidden.jsonl', 'pass'],
];
// D502-D505: a pass control of a new rule must pass BECAUSE of that rule -- its
// count is on the stats line -- not because some older rule vouched for it.
const COUNTED = [
  ['a9-hideaway-control-taken.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-alt-a-state-after-control-taken.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-alt-a-state-after-the-host-leaves.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-retaken-the-frame-after-a-return.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-alt-dropped-while-returned.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-card-re-dug-under-a-new-host.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-residual-trigger-digs-nothing-another-dig-next.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-alt-kept-after-control-returns.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-alt-kept-while-returned-then-retaken.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-alt-kept-after-the-host-leaves.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-dig-two-frames-after-the-entry.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-dig-three-frames-after-the-entry.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-dig-a-frame-before-its-resolution.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-flickered-host-two-cards.jsonl', '(2 an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-countered-first-entry-flicker-card-only.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-resolution-ten-frames-after-the-cast.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-cast-the-frame-after-the-entry-resolved-three-later.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-viewer-own-permanent-taken-back.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-own-permanent-reanimated-by-the-opponent-taken-back.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-alt-a-frame-before-the-take-while-the-aura-resolves.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-alt-a-frame-before-the-opponent-own-watcher-taken.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-two-hosts-the-first-resolver-taken.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['a9-hideaway-resolved-and-unstacked-straddle-a-snapshot.jsonl', 'an opponent\'s hideaway card, its exiling permanent\'s control taken by the viewer, D502'],
  ['stale-token-of-the-opponent.jsonl', 'ceased to exist, another seat\'s token=2'],
  ['ceased-opponent-token-source-choice.jsonl', 'ceased to exist, another seat\'s token=2'],
  ['ceased-opponent-token-bounced-to-its-hand.jsonl', 'ceased to exist, another seat\'s token=2'],
  ['ceased-opponent-token-to-nowhere.jsonl', 'ceased to exist, another seat\'s token=2'],
  ['m55-option-cast-from-the-opponent-hand-held.jsonl', 'entered between frames, an opponent\'s cast=2'],
];
for (const [file, line] of COUNTED) {
  const { code, out } = check(file);
  if (code !== 0 || !out.includes(line)) bad(`${file} must pass with ${JSON.stringify(line)} on its stats line`);
  else console.log(`  ok    ${file} passes, counted (${line})`);
}

for (const [file, level] of REQUIRED) {
  const entry = manifest.find((e) => e.file === file);
  if (entry === undefined) {
    bad(`${file} is missing from ${DIR}/manifest.json -- regenerate with ` +
      'node tools/make-negative-fixtures.mjs');
  } else if (entry.level !== level) {
    bad(`${file} is level ${JSON.stringify(entry.level)} in the manifest, expected ${JSON.stringify(level)}`);
  }
}

for (const entry of manifest) {
  const { file, level, expect, why } = entry;
  const { code, out } = check(file);

  if (level === 'pass') {
    // The control. Every probe below is this file plus one defect, so if this
    // one does not pass, the probes are failing for a reason nobody chose.
    if (code !== 0) {
      bad(`${file} is the UNDEFECTED baseline and the checker rejected it:\n` +
        out.split('\n').filter((l) => l.includes('!')).slice(0, 4).map((l) => `        ${l.trim()}`).join('\n') +
        `\n        -> regenerate with: node tools/make-negative-fixtures.mjs`);
      continue;
    }
    if (/^\s+~ /m.test(out)) {
      bad(`${file} (the baseline) produced warnings; it should be clean`);
      continue;
    }
    console.log(`  ok    ${file} passes clean (the control)`);
    continue;
  }

  if (level === 'warn') {
    // Legitimately reachable, so it must PASS -- but not quietly.
    if (code !== 0) { bad(`${file} should pass with a warning, but the checker failed it`); continue; }
    if (!out.includes(expect)) {
      bad(`${file} passed SILENTLY. Expected a warning containing ${JSON.stringify(expect)}.\n` +
        `        ${why}`);
      continue;
    }
    console.log(`  ok    ${file} passes but warns (${why})`);
    continue;
  }

  if (code === 0) {
    bad(`${file} PASSED, and it must not.\n        ${why}\n` +
      `        This is the checker failing to see a defect -- exactly the regression this ` +
      `corpus exists to catch.`);
    continue;
  }
  if (!out.includes(expect)) {
    bad(`${file} failed, but for the wrong reason: no message contains ${JSON.stringify(expect)}.\n` +
      `        ${why}\n` +
      out.split('\n').filter((l) => l.includes('!')).slice(0, 3).map((l) => `        ${l.trim()}`).join('\n'));
    continue;
  }
  console.log(`  ok    ${file} is rejected (${why})`);
}

// --- and the flag does what it says ---------------------------------------
// `--pre-amendment` is the ONLY way to read a log recorded before 2026-09-11.
// It must turn the four missing-key probes back into warnings -- and it must NOT
// excuse anything else, or it becomes a way to land a leak.
const tolerated = ['p1-stub-without-owner.jsonl', 'p15-card-without-token.jsonl',
  'p3-card-without-alt.jsonl', 'p2-library-without-cards.jsonl',
  'p3-facedownhidden-revived.jsonl'];
for (const file of tolerated) {
  const { code, out } = check(file, ['--pre-amendment']);
  if (code !== 0) bad(`--pre-amendment did not accept ${file}, which is what the flag is for`);
  else if (!out.includes('WARN')) bad(`--pre-amendment accepted ${file} with no WARN line`);
  else console.log(`  ok    ${file} is a WARN under --pre-amendment`);
}
for (const file of ['a1-stub-with-a-name.jsonl', 'a6-opponent-hand-named.jsonl']) {
  const { code } = check(file, ['--pre-amendment']);
  if (code === 0) bad(`--pre-amendment excused ${file} -- the flag is for ABSENT keys, never leaks`);
  else console.log(`  ok    ${file} is still rejected under --pre-amendment`);
}

// --- and so does the other flag -------------------------------------------
// `--opponent-library-ok` is the ONLY way to land a recording in which a seat
// other than the viewer has full cards in `library.cards` (A3 is a failure by
// default since 2026-09-11). It must downgrade exactly that one assertion, and
// it must not excuse A6: an id revealed out of an opponent's library is still
// no licence to name the same card in their HAND later.
{
  const file = 'a3-opponent-library-revealed.jsonl';
  const { code, out } = check(file, ['--opponent-library-ok']);
  if (code !== 0) bad(`--opponent-library-ok did not accept ${file}, which is what the flag is for`);
  else if (!/^\s+~ /m.test(out)) bad(`--opponent-library-ok accepted ${file} with no warning line`);
  else console.log(`  ok    ${file} is a WARN under --opponent-library-ok`);
}
for (const file of ['a6-library-reveal-is-not-a-whitelist.jsonl', 'a6-opponent-hand-named.jsonl']) {
  const { code } = check(file, ['--opponent-library-ok']);
  if (code === 0) {
    bad(`--opponent-library-ok excused ${file} -- the flag relaxes A3 and nothing else, and ` +
      `an opponent-library reveal is TRANSIENT: it confers no name-before-reveal exemption`);
  } else {
    console.log(`  ok    ${file} is still rejected under --opponent-library-ok`);
  }
}

// --- and --partial (D440: the watch runner's served prefix) -----------------
// It skips the three coverage checks and holds back a tail a later line could
// cure -- and nothing else.  So: every probe above fails under it for the same
// reason, every control passes clean, a two-line prefix is exit 3 and not a
// failure, the one frame of slack is undecided when the log is cut inside it and
// still a failure one frame further, and no prefix of a committed recording
// fails it (a stride over fixtures/games/, every line of the small ones; the
// every-line sweep of all of them, about 3.5 minutes, is measured in
// docs/watch-bots.md, *Following a game*).
{
  const { checkFile } = await import('./check-redaction.mjs');
  const lead = (s) => console.log(`  ok    ${s}`);
  let same = 0;
  for (const { file, level, expect } of manifest) {
    const r = checkFile(`${DIR}/${file}`, { partial: true });
    if (level === 'fail') {
      if (r.problems.length === 0 || !r.problems.some((p) => p.includes(expect))) bad(`--partial does not reject ${file} for its reason (${JSON.stringify(expect)}): a leak rule is switched off in partial mode`);
      else same++;
    } else if (r.problems.length > 0) bad(`--partial rejects ${file}, which passes without it: ${r.problems[0]}`);
    else if (level === 'pass' && (r.skipped.length > 0 || r.undecided.length > 0)) bad(`--partial calls the whole control ${file} short (${r.skipped.join('; ')})`);
    else same++;
  }
  if (same === manifest.length) lead(`--partial: every one of the ${manifest.length} controls has the same verdict, for the same reason`);

  /** `n` lines of `file` (or the given line numbers, 1-based), as text. */
  const cut = (file, n) => {
    const L = readFileSync(file, 'utf8').split('\n').filter(Boolean);
    return `${(Array.isArray(n) ? n.map((k) => L[k - 1]) : L.slice(0, n)).join('\n')}\n`;
  };
  const SCRATCH = 'var/check-redaction-selftest';
  mkdirSync(SCRATCH, { recursive: true });
  const cli = (text, flags = ['--partial']) => {
    const f = `${SCRATCH}/prefix-${process.pid}.jsonl`;
    writeFileSync(f, text);
    const r = spawnSync(process.execPath, ['tools/check-redaction.mjs', ...flags, f], { encoding: 'utf8' });
    rmSync(f, { force: true });
    return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
  };
  const two = cut(`${DIR}/baseline.jsonl`, 2);
  const t2 = cli(two);
  const t2full = cli(two, []);
  if (t2.code !== 3 || !/skipped \(coverage, not a leak\): no state frames at all/.test(t2.out) || !t2.out.includes(`decided=${Buffer.byteLength(two)} of`)) bad(`a two-line prefix (the header, hello_ok) under --partial: want exit 3, the skipped line and decided=all, got ${t2.code}`);
  else if (t2full.code !== 1) bad(`a two-line prefix without --partial should still fail (the coverage checks), got ${t2full.code}`);
  else lead('a two-line prefix: --partial exit 3 (coverage skipped, nothing leaked); without the flag still exit 1');
  const whole = cli(readFileSync(`${DIR}/baseline.jsonl`, 'utf8'));
  if (whole.code !== 0) bad(`the whole baseline under --partial: want exit 0, got ${whole.code}`);
  const leak = cli(cut(`${DIR}/a1-stub-with-a-name.jsonl`, 3));
  if (leak.code !== 1 || !leak.out.includes('leaks extra keys: name')) bad(`a three-line prefix whose state carries a named stub under --partial: want exit 1 for A1, got ${leak.code}`);
  else lead('a prefix ending in a leaking state: --partial exit 1, A1');
  rmSync(SCRATCH, { recursive: true, force: true });

  // A6's one frame of slack, cut inside it: the state that shows the opponent's
  // card, then the reveal ask that justifies it, with nothing between them.
  const slackFile = `${DIR}/a6-reveal-ask-one-frame-too-late.jsonl`;
  // (the notice dropped, the ask and the over renumbered so the seq series stays whole)
  const justified = cut(slackFile, [1, 2, 3, 4, 5, 7, 8]).split('\n').filter(Boolean)
    .map((l, i) => (i >= 5 ? JSON.stringify({ ...JSON.parse(l), seq: i }) : l)).join('\n') + '\n';
  const beforeAsk = cut(slackFile, [1, 2, 3, 4, 5]);
  const tooLate = cut(slackFile, [1, 2, 3, 4, 5, 6]);
  const atState = Buffer.byteLength(cut(slackFile, [1, 2, 3, 4]));
  const j = checkFile('justified.jsonl', { text: justified });
  const p5 = checkFile('before-ask.jsonl', { partial: true, text: beforeAsk });
  const f5 = checkFile('before-ask.jsonl', { text: beforeAsk });
  const p6 = checkFile('too-late.jsonl', { partial: true, text: tooLate });
  if (j.problems.length > 0) bad(`the slack fixture with the ask straight after the state should pass whole: ${j.problems[0]}`);
  else if (p5.problems.length > 0 || p5.undecided.length === 0 || p5.decidedBytes !== atState) bad(`cut between the state and its ask, --partial should hold the state undecided (decided=${atState}), got problems=${p5.problems.length} undecided=${p5.undecided.length} decided=${p5.decidedBytes}`);
  else if (f5.problems.length === 0) bad('cut between the state and its ask, the FULL check should fail it (nothing after it justifies it)');
  else if (p6.problems.length === 0 || !p6.problems.some((x) => x.includes('carries a name'))) bad('cut one frame later (a notice after the state), --partial should fail it: the slack is one frame');
  else lead(`A6's slack cut inside it: --partial holds the state back (decided=${atState} bytes), one frame later it fails`);

  // M55's D3: a decision may name the NEXT state's cards; cut before that state, it waits.
  const d3 = `${DIR}/m55-option-names-the-opponent-hand.jsonl`;
  const d4 = checkFile('d3.jsonl', { partial: true, text: cut(d3, 4) });
  const d5 = checkFile('d3.jsonl', { partial: true, text: cut(d3, 5) });
  if (d4.problems.length > 0 || d4.undecided.length === 0 || d4.decidedBytes !== Buffer.byteLength(cut(d3, 3))) bad(`a decision naming a card with no later state yet: --partial should hold it undecided, got problems=${d4.problems.length} undecided=${d4.undecided.length}`);
  else if (d5.problems.length === 0) bad('the same decision once the next state is in the prefix (and does not show the card): --partial should fail it');
  else lead('M55 D3 cut before the next state: undecided; with it: a failure');

  // D495: a spell copy's cast may come after EMPTY states (three copies choosing
  // targets in turn); cut after the empty state the decision waits, and once the
  // eventful state is in the prefix it passes.
  const sc = `${DIR}/stack-copy-cast-after-empty-states.jsonl`;
  const sc5 = checkFile('sc.jsonl', { partial: true, text: cut(sc, 5) });
  const sc6 = checkFile('sc.jsonl', { partial: true, text: cut(sc, 6) });
  if (sc5.problems.length > 0 || sc5.undecided.length === 0) bad(`a spell copy's decision cut after its empty state: --partial should hold it undecided, got problems=${sc5.problems.length} undecided=${sc5.undecided.length}`);
  else if (sc6.problems.length > 0 || sc6.undecided.length > 0) bad(`the same decision once the copy's cast is in the prefix: --partial should pass it, got problems=${sc6.problems.length} undecided=${sc6.undecided.length}`);
  else lead('D495 spell copy cut after its empty state: undecided; with the cast: a pass');

  // D496: a reveal vouches only with the zone event that moved the card where the
  // seat sees it, in the states up to the first one after the decision -- so a
  // prefix cut right after the decision waits, and passes once that state is in;
  // a reveal AFTER the decision cures nothing, so that one waits and then fails.
  const rv = `${DIR}/reveal-vouches-the-option.jsonl`;
  const rv5 = checkFile('rv.jsonl', { partial: true, text: cut(rv, 5) });
  const rv6 = checkFile('rv.jsonl', { partial: true, text: cut(rv, 6) });
  const ra = `${DIR}/reveal-after-the-decision.jsonl`;
  const ra5 = checkFile('ra.jsonl', { partial: true, text: cut(ra, 5) });
  const ra6 = checkFile('ra.jsonl', { partial: true, text: cut(ra, 6) });
  if (rv5.problems.length > 0 || rv5.undecided.length === 0) bad(`a decision a reveal names, cut before the next state: --partial should hold it undecided, got problems=${rv5.problems.length} undecided=${rv5.undecided.length}`);
  else if (rv6.problems.length > 0 || rv6.undecided.length > 0) bad(`the same once the state with its zone events is in the prefix: --partial should pass it, got problems=${rv6.problems.length} undecided=${rv6.undecided.length}`);
  else if (ra5.problems.length > 0 || ra5.undecided.length === 0) bad(`a decision whose reveal comes after it, cut after that reveal: --partial should hold it undecided, got problems=${ra5.problems.length} undecided=${ra5.undecided.length}`);
  else if (ra6.problems.length === 0) bad('the same once the next state is in the prefix: --partial should fail it (a reveal after the decision vouches for nothing)');
  else lead('D496 reveal: cut before the next state, undecided; with its zone events, a pass; a reveal after the decision waits, then fails');

  // D512: an alt one frame ahead of its listed take waits for the next state
  // frame.  Cut at the frame of the aura's attach, --partial holds it undecided
  // (and a whole check of that prefix fails it); with the take's frame it
  // passes; with a frame that lists no take it fails.
  const ld = `${DIR}/a9-hideaway-alt-a-frame-before-the-take-while-the-aura-resolves.jsonl`;
  const nv = `${DIR}/a9-hideaway-alt-before-a-take-that-never-comes.jsonl`;
  const ld6 = checkFile('ld.jsonl', { partial: true, text: cut(ld, 6) });
  const ld6full = checkFile('ld.jsonl', { text: cut(ld, 6) });
  const ld7 = checkFile('ld.jsonl', { partial: true, text: cut(ld, 7) });
  const nv7 = checkFile('nv.jsonl', { partial: true, text: cut(nv, 7) });
  if (ld6.problems.length > 0 || ld6.undecided.length === 0 || ld6.decidedBytes !== Buffer.byteLength(cut(ld, 5))) bad(`an alt ahead of its take, cut at the attach's frame: --partial should hold it undecided, got problems=${ld6.problems.length} undecided=${ld6.undecided.length} decided=${ld6.decidedBytes}`);
  else if (ld6full.problems.length === 0) bad('the same prefix checked whole should fail (no frame lists the take)');
  else if (ld7.problems.length > 0 || ld7.undecided.length > 0) bad(`the same once the take's frame is in the prefix: --partial should pass it, got problems=${ld7.problems.length} undecided=${ld7.undecided.length}`);
  else if (!nv7.problems.some((x) => x.includes(':6: ') && x.includes('only a look permission'))) bad('an alt ahead of a take the next frame does not list: --partial should fail the attach\'s frame');
  else lead('D512 lead: cut at the attach, undecided (a whole check fails it); with the take, a pass; with no take the next frame, a failure');

  // No prefix of a healthy recording fails --partial.
  const t0 = Date.now();
  let prefixes = 0;
  const sweep = (file, stride) => {
    const text = readFileSync(file, 'utf8');
    const L = text.split('\n').filter(Boolean);
    let at = 0;
    const ends = L.map((l) => (at += Buffer.byteLength(l) + 1));
    const buf = Buffer.from(text);
    for (let k = 1; k <= L.length; k += (k < 6 ? 1 : stride)) {
      const r = checkFile(file, { partial: true, text: buf.subarray(0, ends[k - 1]).toString('utf8') });
      prefixes++;
      if (r.problems.length > 0) { bad(`${file} cut at ${k} lines fails --partial: ${r.problems[0].slice(0, 300)}`); return; }
    }
  };
  for (const { file, level } of manifest) if (level !== 'fail') sweep(`${DIR}/${file}`, 1);
  for (const f of readdirSync('fixtures/synthetic').filter((x) => x.endsWith('.jsonl'))) sweep(`fixtures/synthetic/${f}`, 1);
  for (const f of readdirSync('fixtures/games').filter((x) => x.endsWith('.jsonl')).sort()) sweep(`fixtures/games/${f}`, 97);
  lead(`${prefixes} prefixes of the committed recordings pass --partial (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

// --- and --empty-hand-ok (D460: the move atlas's branch logs) ----------------
// It turns "not one card was redacted" and "the viewer never saw a named card"
// into WARNs only where the file proves the hand empty in every state -- and
// nothing else.  So: the default is unchanged, every probe keeps its verdict
// under the flag, an emptied hand passes with a WARN, and a hand that is not
// empty -- a full opponent card at count 1, a count of 1 with no stub, a listed
// library card -- still fails, with the flag saying why it does not apply.
// D501: a library listing only the top card A3 vouches for is not a listing;
// the same shape with a hand card, or with no revealer of theirs, still fails.
{
  const { checkFile } = await import('./check-redaction.mjs');
  const lead = (s) => console.log(`  ok    ${s}`);
  let same = 0;
  for (const { file, level, expect } of manifest) {
    const r = checkFile(`${DIR}/${file}`, { emptyHandOk: true });
    if (level === 'fail') {
      if (!r.problems.some((p) => p.includes(expect))) bad(`--empty-hand-ok does not reject ${file} for its reason (${JSON.stringify(expect)})`);
      else same++;
    } else if (r.problems.length > 0) bad(`--empty-hand-ok rejects ${file}, which passes without it: ${r.problems[0]}`);
    else same++;
  }
  if (same === manifest.length) lead(`--empty-hand-ok: every one of the ${manifest.length} controls has the same verdict, for the same reason`);

  const base = readFileSync(`${DIR}/baseline.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const seat = base[0].seat;
  /** The baseline with `edit(player, isViewer, stateIndex)` applied to every state's players. */
  const variant = (edit) => `${base.map((f, i) => {
    if (i === 0 || f.type !== 'state') return JSON.stringify(f);
    const g = structuredClone(f);
    for (const p of g.body.players) edit(p, p.id === seat, i);
    return JSON.stringify(g);
  }).join('\n')}\n`;
  const empty = { count: 0, cards: [] };
  const firstState = base.findIndex((f) => f.type === 'state');
  // a full card's shape, under an id this log never showed the viewer (so nothing revealed it)
  const oppCard = { ...structuredClone(base[firstState].body.players.find((p) => p.id === seat).zones.hand.cards[0]), id: 9001 };
  const NOTHING = 'not one card was redacted';
  const NAMED = 'the viewer never saw a named card in their own hand';
  const run = (name, text, flag) => checkFile(name, { text, emptyHandOk: flag });
  const has = (r, msg) => r.problems.some((p) => p.includes(msg));
  const warns = (r, msg) => r.warnings.some((w) => w.includes(msg) && w.includes('--empty-hand-ok'));

  // The proof holds: the opponent's hand empty in every state, its library a bare count.
  const oppEmpty = variant((p, v) => { if (!v) p.zones.hand = { ...empty }; });
  const o0 = run('opp-empty.jsonl', oppEmpty, false);
  const o1 = run('opp-empty.jsonl', oppEmpty, true);
  if (!has(o0, NOTHING)) bad('an opponent hand empty in every state, WITHOUT the flag: "not one card was redacted" must still fail (the default is unchanged)');
  else if (o1.problems.length > 0 || !warns(o1, NOTHING)) bad(`the same file under --empty-hand-ok: want a pass with a WARN, got ${o1.problems[0] ?? 'no warning'}`);
  else lead('an opponent hand empty in every state: a failure by default, a WARN under --empty-hand-ok');

  // The seat-1 twin: the viewer's own hand empty in every state.
  const viewerEmpty = variant((p, v) => { if (v) p.zones.hand = { ...empty }; });
  const v0 = run('viewer-empty.jsonl', viewerEmpty, false);
  const v1 = run('viewer-empty.jsonl', viewerEmpty, true);
  if (!has(v0, NAMED)) bad('a viewer hand empty in every state, WITHOUT the flag: "the viewer never saw a named card" must still fail');
  else if (v1.problems.length > 0 || !warns(v1, NAMED)) bad(`the same file under --empty-hand-ok: want a pass with a WARN, got ${v1.problems[0] ?? 'no warning'}`);
  else lead('a viewer hand empty in every state: a failure by default, a WARN under --empty-hand-ok');

  // Negative controls: the proof does not hold, so the coverage failure stands under the flag.
  const plant = (name, edit, why, also) => {
    const r = run(name, variant(edit), true);
    if (!has(r, NOTHING) || !r.problems.some((p) => p.includes(NOTHING) && p.includes(`--empty-hand-ok does not apply: ${why}`))) {
      bad(`${name} under --empty-hand-ok: "${NOTHING}" must still FAIL, saying "${why}"; got ${r.problems.find((p) => p.includes(NOTHING)) ?? r.problems[0] ?? 'a pass'}`);
    } else if (also && !has(r, also)) bad(`${name} under --empty-hand-ok: want the leak rule's own failure too (${JSON.stringify(also)})`);
    else lead(`${name}: still a failure under --empty-hand-ok (${why})`);
  };
  // a broken canBeShownTo: the opponent's one card, full, at count 1 (the other states empty)
  plant('opp-full-card-count-1.jsonl', (p, v, i) => {
    if (v) return;
    p.zones.hand = i === firstState ? { count: 1, cards: [{ ...oppCard, owner: p.id, controller: p.id }] } : { ...empty };
  }, 'another seat\'s hand is not empty', 'is not marked hidden');
  // a count of 1 with no stub: the card went missing instead of being redacted
  plant('opp-count-1-no-stub.jsonl', (p, v, i) => {
    if (v) return;
    p.zones.hand = i === firstState ? { count: 1, cards: [] } : { ...empty };
  }, 'another seat\'s hand is not empty', 'count=1 but cards.length=0');
  // the opponent's library listed: full cards where a bare count belongs
  plant('opp-library-listed.jsonl', (p, v, i) => {
    if (v) return;
    p.zones.hand = { ...empty };
    if (i === firstState) p.zones.library = { count: p.zones.library.count, cards: [{ ...oppCard, zone: 'library', owner: p.id, controller: p.id }] };
  }, 'a card of another seat\'s hand or library is listed', 'full card(s) in library.cards');
  // the opponent seat left out of the states (the #178 review): an empty hand nobody listed proves nothing
  const dropOpp = (which) => `${base.map((f, i) => {
    if (i === 0 || f.type !== 'state') return JSON.stringify(f);
    const g = structuredClone(f);
    for (const p of g.body.players) if (p.id === seat) p.zones.hand = { ...empty };
    if (which(i)) g.body.players = g.body.players.filter((p) => p.id === seat);
    else for (const p of g.body.players) if (p.id !== seat) p.zones.hand = { ...empty };
    return JSON.stringify(g);
  }).join('\n')}\n`;
  for (const [name, which, why] of [
    ['opp-seat-never-listed.jsonl', () => true, 'no state lists any seat but the viewer\'s'],
    ['opp-seat-missing-once.jsonl', (i) => i === firstState, `the state at line ${firstState + 1} lists 1 of the 2 seats`],
  ]) {
    const r = run(name, dropOpp(which), true);
    const ok = (msg) => r.problems.some((p) => p.includes(msg) && p.includes(`--empty-hand-ok does not apply: ${why}`));
    if (!ok(NOTHING) || !ok(NAMED)) bad(`${name} under --empty-hand-ok: "${NOTHING}" and "${NAMED}" must both still FAIL, saying "${why}"; got ${r.problems.find((p) => p.includes(NOTHING)) ?? r.problems[0] ?? 'a pass'}`);
    else lead(`${name}: still a failure under --empty-hand-ok (${why})`);
  }
  // D501 (J181's b-s07 spine): the opponent's hand empty in every state while
  // they control Oracle of Mul Daya, so every state lists their library's top
  // card -- one card A3 vouches for.  That is public, not hidden: a failure by
  // default, a WARN under the flag that says so.  The controls: the same shape
  // with a card in their hand (the last top card, drawn and served full), and one
  // library card that no permanent of theirs vouches for (no revealer, or the
  // revealer is the viewer's), and two cards under their revealer -- each still a
  // failure, for its reason.
  const revealer = (p, controller) => ({ ...oppCard, id: 9101, name: 'Oracle of Mul Daya', zone: 'battlefield', owner: controller, controller });
  const topCard = (p) => ({ ...oppCard, id: 9102, zone: 'library', owner: p.id, controller: p.id });
  const s07 = (p, v, i, { hand = () => ({ ...empty }), revealedBy = 'them', tops = 1 } = {}) => {
    if (v) {
      if (revealedBy === 'viewer') {
        p.zones.battlefield.cards.push(revealer(p, seat));
        p.zones.battlefield.count = p.zones.battlefield.cards.length;
      }
      return;
    }
    p.zones.hand = hand(i);
    if (revealedBy === 'them') {
      p.zones.battlefield.cards.push(revealer(p, p.id));
      p.zones.battlefield.count = p.zones.battlefield.cards.length;
    }
    p.zones.library = { count: p.zones.library.count, cards: Array.from({ length: tops }, (_, k) => ({ ...topCard(p), id: 9102 + 10 * k })) };
  };
  {
    const text = variant((p, v, i) => s07(p, v, i));
    const t0 = run('opp-empty-top-revealed.jsonl', text, false);
    const t1 = run('opp-empty-top-revealed.jsonl', text, true);
    const TOP = 'its library listed only its revealed top card (A3)';
    if (!has(t0, NOTHING)) bad('an opponent hand empty in every state beside a library top Oracle of Mul Daya reveals, WITHOUT the flag: "not one card was redacted" must still fail');
    else if (t1.problems.length > 0 || !warns(t1, NOTHING) || !warns(t1, TOP)) bad(`the same file under --empty-hand-ok: want a pass with a WARN saying "${TOP}", got ${t1.problems[0] ?? t1.warnings.find((w) => w.includes(NOTHING)) ?? 'no warning'}`);
    else if (t1.stats.revealedTops !== base.filter((f) => f.type === 'state').length) bad(`the same file: want A3 to vouch for the top card in every state, got ${t1.stats.revealedTops}`);
    else lead('an opponent hand empty in every state, its library listing only the top card A3 vouches for: a failure by default, a WARN under --empty-hand-ok (D501)');
  }
  plant('opp-top-revealed-hand-card.jsonl', (p, v, i) => s07(p, v, i, {
    hand: (j) => (j === firstState ? { count: 1, cards: [{ ...topCard(p), id: 9103, zone: 'hand' }] } : { ...empty }),
  }), 'another seat\'s hand is not empty', 'is not marked hidden');
  plant('opp-library-listed-no-revealer.jsonl', (p, v, i) => s07(p, v, i, { revealedBy: null }),
    'a card of another seat\'s hand or library is listed', 'full card(s) in library.cards');
  plant('opp-library-listed-viewer-revealer.jsonl', (p, v, i) => s07(p, v, i, { revealedBy: 'viewer' }),
    'a card of another seat\'s hand or library is listed', 'full card(s) in library.cards');
  plant('opp-top-revealed-two-cards.jsonl', (p, v, i) => s07(p, v, i, { tops: 2 }),
    'a card of another seat\'s hand or library is listed', 'full card(s) in library.cards');
  // and the twin: the viewer's hand at count 1 served as a stub
  {
    const r = run('viewer-count-1-stub.jsonl', variant((p, v, i) => {
      if (!v) return;
      p.zones.hand = i === firstState ? { count: 1, cards: [{ id: oppCard.id, zone: 'hand', owner: seat, controller: seat, hidden: true }] } : { ...empty };
    }), true);
    if (!r.problems.some((p) => p.includes(NAMED) && p.includes('--empty-hand-ok does not apply: the viewer\'s hand is not empty'))) bad(`a viewer hand at count 1 (a stub) under --empty-hand-ok: "${NAMED}" must still FAIL; got ${r.problems[0] ?? 'a pass'}`);
    else lead('viewer-count-1-stub.jsonl: still a failure under --empty-hand-ok (the viewer\'s hand is not empty)');
  }
}

if (failures > 0) {
  console.log(`\ncheck-redaction self-test FAILED (${failures})`);
  process.exit(1);
}
console.log('\ncheck-redaction self-test OK');
