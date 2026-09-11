/*
 * mtg-table — web/test/human-seat.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * `fixtures/games/human-auto-*.jsonl` — **the first recordings with a human seat
 * in them**, and therefore the first artifacts in the repo that contain real
 * `input`, `ask`, `act` and `answer` frames rather than hand-written ones. Seat
 * 0 is a `PlayerControllerHuman` driven by a scripted policy; seat 1 is the AI.
 *
 * Everything the protocol says about the interactive half was evidenced until
 * now by exactly two things: prose in `docs/protocol.md` §4 and §5, and
 * `fixtures/synthetic/sample-handwritten.jsonl`, which was written from the same
 * reading of that prose as `protocol.ts`, by the same hand. A synthetic fixture
 * can prove the reducer is total over a shape; it cannot prove the Java emitter
 * produces it. These are where that changes, so the assertions below are the
 * ones that can actually fail for a reason nobody chose:
 *
 *   - `reduce()` does not throw on a single frame;
 *   - `input` and `ask` **merge into the one `ClientState`** (§4.1: two frames
 *     on the wire, one object in the client) — `state.input` is the last input
 *     body, `state.ask` is the outstanding question and `null` once it is
 *     answered;
 *   - every `ask` is followed by **exactly one** `answer` carrying the same
 *     `askId` (§2.3), and the answer comes after the question in file order;
 *   - every `ask.kind` is one of the eleven (§5.2) and every option `id` is the
 *     ask-local index it claims to be (§5.1).
 *
 * `fixtures.test.ts` globs `fixtures/games/`, so these recordings *also* get the
 * whole redaction contract — the opponent's hand is stubs, no engine string
 * names a concealed card, the session header does not identify the opponent's
 * decklist — for free, and `render.test.tsx` mounts `<Board/>` over every one of
 * their frames. This file holds only what is specific to a seat being played.
 *
 * **It skips when no such recording exists**, with a diagnostic naming the one
 * the plan calls for. A suite that went red on a machine where the recording had
 * not been made would be a worse signal than a skip that says why.
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  ASK_KINDS,
  isAskKind,
  type AskBody,
  type AskOption,
  type HelloOkBody,
  type InputBody,
} from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog, type ParsedFrameLog } from '../src/transport/replay.ts';

const DIR = fileURLToPath(new URL('../../fixtures/games/', import.meta.url));

/** The recording `PLAN.md` names; the rest are the same policy at other seeds. */
const CANONICAL = 'human-auto-42.jsonl';

/** Every human-seat recording in the corpus, canonical one first. */
function humanFixtures(): string[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((name) => name.startsWith('human-') && name.endsWith('.jsonl'))
    .sort((a, b) => (a === CANONICAL ? -1 : b === CANONICAL ? 1 : a.localeCompare(b)));
}

const FILES = humanFixtures();

/** The lists an option array can live under, per kind (§5.1, §5.2). */
const OPTION_LISTS: Record<string, string[]> = {
  ability_menu: ['options'],
  options: ['options'],
  choose_list: ['options'],
  choose_entities: ['options'],
  // A kind with two lists is ONE server-side array in two halves, and the ids
  // run across both in the order §5.2 names them.
  order: ['dest', 'source'],
  sideboard: ['main', 'side'],
  assign_damage: ['targets'],
  assign_amount: ['targets'],
  manipulate_list: ['cards'],
  confirm: [],
  text: [],
};

function load(file: string): ParsedFrameLog {
  return parseFrameLog(readFileSync(DIR + file, 'utf8'));
}

if (FILES.length === 0) {
  test('a human-seat recording exists', (t) => {
    t.diagnostic(
      `no fixtures/games/human-*.jsonl. ${CANONICAL} is the first recording with a human seat ` +
        `— a PlayerControllerHuman on seat 0 driven by a scripted policy — and until one ` +
        `exists every assertion about input/ask/act/answer in this repo rests on a ` +
        `hand-written fixture. Record it and this file starts asserting instead of skipping.`,
    );
    t.skip('no human-seat recording has been made yet');
  });
}

for (const file of FILES) {
  test(`${file}: is a log of a game somebody played`, (t) => {
    const log = load(file);
    assert.deepEqual(log.warnings, [], 'parser warnings');
    assert.notEqual(log.header, null, 'no session header (§8.1)');
    assert.ok(log.frames.length > 0, 'no frames');

    const hello = log.frames.find((frame) => frame.type === 'hello_ok');
    assert.notEqual(hello, undefined, 'no hello_ok frame');
    const body = hello!.body as HelloOkBody;
    const seat = log.header!.seat;
    assert.equal(body.you, seat, 'hello_ok.you disagrees with the session header seat (§8.1, §2.1)');

    // The whole point of these fixtures: the viewing seat is NOT an AI. If it
    // is, the log is another AI-vs-AI recording wearing a different filename and
    // every assertion below is vacuous.
    const me = body.players.find((player) => player.id === seat);
    assert.notEqual(me, undefined, `hello_ok.players has no entry for the viewing seat ${seat}`);
    assert.equal(
      me!.isAi,
      false,
      `the viewing seat (${seat}) is marked isAi — this is not a human-seat recording, so the ` +
        `input/ask/answer assertions below would pass by being empty`,
    );

    const types = new Set(log.frames.map((frame) => frame.type));
    for (const wanted of ['input', 'ask', 'answer'] as const) {
      assert.ok(
        types.has(wanted),
        `no ${wanted} frame in a human-seat recording. §8.4 says an AI-vs-AI log has none of ` +
          `these because nobody is playing; this one has a seat, so their absence means the ` +
          `WireGuiGame path did not run.`,
      );
    }
    t.diagnostic(`${String(log.frames.length)} frames; types: ${[...types].sort().join(', ')}`);
  });

  test(`${file}: replays through the real reducer without throwing, and ends game over`, () => {
    const log = load(file);
    let state = initialState(log.header);
    for (let i = 0; i < log.frames.length; i++) {
      const frame = log.frames[i]!;
      try {
        state = reduce(state, frame);
      } catch (cause) {
        assert.fail(
          `${file}: reduce threw on frame ${String(i)} (seq=${String(frame.seq)} ` +
            `type=${frame.type}): ${String(cause)}`,
        );
      }
    }
    assert.equal(state.framesApplied, log.frames.length);
    assert.notEqual(state.gameOver, null, 'the log does not reach the end of a game');
  });

  test(`${file}: input and ask merge into the ONE client state (§4.1)`, (t) => {
    // §4.1: two frames on the wire, one object in the client. A client that kept
    // a prompt stream beside a board stream is where "the board threw the
    // engine's answer away" bugs live, so the reducer folds both into
    // `ClientState` and `render(state)` is total over the result.
    const log = load(file);
    let state: ClientState = initialState(log.header);
    let inputs = 0;
    let asks = 0;
    let answers = 0;

    for (const frame of log.frames) {
      state = reduce(state, frame);

      if (frame.type === 'input') {
        inputs += 1;
        assert.deepEqual(
          state.input,
          frame.body as InputBody,
          'an `input` frame must replace state.input wholesale — it is not merged field by field',
        );
        // The board reads these unguarded (§4 declares all of them always
        // present), so an absent key here is a renderer crash, not a default.
        const input = state.input!;
        assert.equal(typeof input.prompt, 'string', 'input.prompt is always a string');
        assert.equal(typeof input.buttons.ok.label, 'string');
        assert.equal(typeof input.buttons.ok.enabled, 'boolean');
        assert.equal(typeof input.buttons.cancel.label, 'string');
        assert.equal(typeof input.buttons.cancel.enabled, 'boolean');
        assert.ok(Array.isArray(input.selectable.cardIds));
        assert.ok(Array.isArray(input.highlighted));
        assert.ok(Array.isArray(input.weak), 'input.weak is always present, `[]` until M5 (§4)');
        assert.ok(Array.isArray(input.openZones), 'input.openZones is always present (§4.3)');
        assert.ok(
          ['cards', 'players', 'none'].includes(input.selectable.mode),
          `input.selectable.mode = ${JSON.stringify(input.selectable.mode)} is not one of §4's three`,
        );
        // §4: `focusCard` is the serialised card for `focusCardId`, because
        // setCard/setPanelSelection are pushed with cards that are not in the
        // snapshot. The key is always present; the two must agree.
        assert.ok('focusCard' in input, 'input.focusCard is always present (§4, amendment P7)');
        if (input.focusCard !== null) {
          assert.equal(
            input.focusCard.id,
            input.focusCardId,
            'input.focusCard is not the card input.focusCardId names',
          );
        }
        continue;
      }

      if (frame.type === 'ask') {
        asks += 1;
        assert.deepEqual(
          state.ask,
          frame.body as AskBody,
          'an `ask` frame must become state.ask — the game thread is blocked until it is answered',
        );
        continue;
      }

      if (frame.type === 'answer') {
        answers += 1;
        // §2.3 / reduce.ts: an answer for the outstanding askId clears it. An
        // answer for any other askId is ignored and the question stays up.
        assert.equal(
          state.ask,
          null,
          'an `answer` did not clear state.ask — either it carried the wrong askId or two ' +
            'questions were outstanding at once, and only one thing can block the game thread',
        );
      }
    }

    assert.ok(inputs > 0, 'no input frames — §4 is unevidenced by this recording');
    assert.ok(asks > 0, 'no ask frames — §5 is unevidenced by this recording');
    t.diagnostic(`${String(inputs)} input, ${String(asks)} ask, ${String(answers)} answer frames`);
  });

  test(`${file}: every ask is closed by exactly one answer with the same askId (§2.3)`, (t) => {
    const log = load(file);
    /** askId → the index of the ask frame that opened it. */
    const opened = new Map<string, number>();
    /** askId → every index that answered it. More than one is the failure. */
    const answered = new Map<string, number[]>();

    for (let i = 0; i < log.frames.length; i++) {
      const frame = log.frames[i]!;
      if (frame.type === 'ask') {
        const body = frame.body as AskBody;
        assert.equal(typeof body.askId, 'string', `frame ${String(i)}: ask has no askId`);
        assert.ok(
          !opened.has(body.askId),
          `askId ${JSON.stringify(body.askId)} is reused (frames ` +
            `${String(opened.get(body.askId))} and ${String(i)}) — §5 says it is unique for the ` +
            `life of the connection`,
        );
        opened.set(body.askId, i);
        continue;
      }
      if (frame.type !== 'answer') continue;
      const { askId } = frame.body as { askId: string };
      assert.equal(typeof askId, 'string', `frame ${String(i)}: answer has no askId`);
      const at = opened.get(askId);
      assert.notEqual(
        at,
        undefined,
        `frame ${String(i)}: an answer for askId ${JSON.stringify(askId)} that no earlier ask ` +
          `opened. §2.3 pairs one answer to one ask, and an answer that arrives first is a ` +
          `ReplyPool completing a future nobody was waiting on.`,
      );
      assert.ok(at! < i, `answer for ${askId} precedes its ask`);
      answered.set(askId, [...(answered.get(askId) ?? []), i]);
    }

    for (const [askId, at] of opened) {
      const closes = answered.get(askId) ?? [];
      assert.equal(
        closes.length,
        1,
        closes.length === 0
          ? `ask ${JSON.stringify(askId)} (frame ${String(at)}) is never answered. An ask blocks ` +
            `the Forge game thread until an answer arrives (§5), so an unanswered one is a wedge ` +
            `— and §5.4 says every ask must be answerable with null precisely so this cannot ` +
            `happen.`
          : `ask ${JSON.stringify(askId)} (frame ${String(at)}) is answered ` +
            `${String(closes.length)} times, at frames ${closes.join(', ')}. §2.3: a second ` +
            `answer for a completed askId is dropped with a notice and never applied.`,
      );
    }
    assert.ok(opened.size > 0, 'no asks at all');
    t.diagnostic(`${String(opened.size)} asks, each answered exactly once`);
  });

  test(`${file}: every ask.kind is one of the eleven, and option ids are ask-local indices`, (t) => {
    // §5.1 / §5.2. `id` is the 0-based position in the server's option array for
    // this askId, NOT a Forge id — it has to be, because one ask's options can
    // be colours, abilities, integers and cards at once, and `Integer 3` and
    // `CardView 3` would collide on any shared id space. The answer echoes
    // indices and the bridge marshals them back through `pendingOpts`.
    const log = load(file);
    const kinds = new Set<string>();
    let options = 0;

    for (const frame of log.frames) {
      if (frame.type !== 'ask') continue;
      const body = frame.body as AskBody;
      assert.ok(
        isAskKind(body.kind),
        `ask.kind ${JSON.stringify(body.kind)} is not one of the eleven in §5.2 ` +
          `(${[...ASK_KINDS].join(', ')}). open_zones was deleted: it is the non-blocking ` +
          `input.openZones hint, not a question.`,
      );
      kinds.add(body.kind);
      assert.equal(typeof body.timeoutMs, 'number', `ask ${body.askId} has no timeoutMs`);

      const raw = body as unknown as Record<string, unknown>;
      const flat: AskOption[] = (OPTION_LISTS[body.kind] ?? []).flatMap((key) =>
        Array.isArray(raw[key]) ? (raw[key] as AskOption[]) : [],
      );
      flat.forEach((option, i) => {
        options += 1;
        assert.equal(
          option.id,
          i,
          `${body.kind} option ${JSON.stringify(option.label)} has id ${String(option.id)} but ` +
            `is entry ${String(i)} of ${(OPTION_LISTS[body.kind] ?? []).join(' ++ ')} — §5.1 says ` +
            `the id IS the index, so an answer echoing it would address the wrong object`,
        );
        assert.equal(typeof option.label, 'string', 'an option with no label renders as nothing');
        // The label leak (report 07 §7): `String.valueOf(CardView)` prints the
        // card's real name, so a concealed option must arrive already labelled
        // by the bridge — and its card, if it carries one, is the five-key stub.
        if (option.card !== undefined && option.card.hidden === true) {
          assert.equal(
            Object.keys(option.card).length,
            5,
            `a concealed card inside an ask body is the five-key stub (§3.3), not ` +
              `${String(Object.keys(option.card).length)} keys`,
          );
        }
      });
    }
    t.diagnostic(
      `${String(kinds.size)} ask kinds (${[...kinds].sort().join(', ')}), ` +
        `${String(options)} options`,
    );
  });
}

/*
 * The two probe recordings, each of which exists to evidence exactly one thing
 * that no ordinary game reaches. They are asserted by NAME, because a corpus
 * that quietly loses one goes back to proving the shape and not the behaviour —
 * which is the failure mode `docs/protocol.md` §8.5 records for every other
 * fixture in the directory.
 */

const TRAMPLE = 'human-trample-7.jsonl';
const SCRY = 'human-scry-7.jsonl';

test(`${TRAMPLE}: the engine really dispatched assign_damage (§5.3)`, (t) => {
  if (!FILES.includes(TRAMPLE)) {
    t.skip(`no ${TRAMPLE}: record decks/trample-probe.dck vs decks/morph-probe.dck at seed 7`);
    return;
  }
  const log = load(TRAMPLE);
  const asks = log.frames.filter((f) => f.type === 'ask').map((f) => f.body as AskBody);
  const damage = asks.filter((a) => a.kind === 'assign_damage');
  assert.ok(
    damage.length > 0,
    `${TRAMPLE} carries no assign_damage ask. PlayerControllerHuman only asks the GUI when ` +
      `the attacker has trample or is blocked by more than one creature, so this recording is ` +
      `the only evidence in the repo that the kind is reachable at all`,
  );
  for (const ask of damage) {
    // §5.3's trap, from the wire end: the defender is option 0 and the server
    // marshals that index back to the map key `null`.
    const first = ask.targets[0];
    assert.notEqual(first, undefined, 'assign_damage with no targets');
    assert.equal(first!.id, 0, 'the defender is not option index 0');
    assert.equal(
      (first as { defender?: boolean }).defender,
      true,
      'targets[0] does not carry defender: true',
    );
    assert.ok(ask.total > 0, 'assign_damage with no damage to assign');
    ask.targets.forEach((target, i) => {
      assert.equal(target.id, i, `targets[${String(i)}].id is not its own index`);
    });
  }
  t.diagnostic(
    `${String(damage.length)} assign_damage ask(s); targets: ` +
      damage.map((a) => a.targets.length).join(', '),
  );
});

test(`${SCRY}: input.focusCard carries a card the snapshot does not have (amendment H)`, (t) => {
  if (!FILES.includes(SCRY)) {
    t.skip(`no ${SCRY}: record decks/scry-probe.dck vs decks/morph-probe.dck at seed 7`);
    return;
  }
  const log = load(SCRY);
  let state = initialState(log.header);
  let withCard = 0;
  let notInState = 0;
  /** Every card id the current snapshot carries, across both seats and the stack. */
  const idsOf = (board: ClientState['board']): Set<number> => {
    const ids = new Set<number>();
    if (board === null) return ids;
    for (const player of board.players) {
      for (const zone of Object.values(player.zones)) {
        for (const card of zone.cards) ids.add(card.id);
      }
    }
    for (const card of board.stackCards) ids.add(card.id);
    return ids;
  };
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type !== 'input') continue;
    const focus = (frame.body as InputBody).focusCard;
    if (focus === null) continue;
    withCard += 1;
    // A focusCard that is not in the snapshot it arrived with is the case
    // amendment H added the field for: setCard is pushed on the game thread
    // with a LIBRARY card (surveil, willPutCardOnTop), and a bare focusCardId
    // would render blank.
    if (!idsOf(state.board).has(focus.id)) notInState += 1;
  }
  assert.ok(
    withCard > 0,
    `${SCRY} has no input frame with a serialised focusCard. Only a game-thread setCard can ` +
      `produce one (WireGuiGame.cardJsonIfOnGameThread), and scry 1 with ` +
      `UI_SELECT_FROM_CARD_DISPLAYS off (D13) is the cheapest way to reach it`,
  );
  assert.ok(
    notInState > 0,
    `${SCRY} carries ${String(withCard)} focusCard(s), but every one of them was already in ` +
      `the snapshot — so it does not evidence the case amendment H exists for`,
  );
  t.diagnostic(
    `${String(withCard)} focusCard pushes, ${String(notInState)} of them absent from the ` +
      `state they arrived with`,
  );
});

/**
 * Amendment **M8**, pinned to the recordings that produced it.
 *
 * `docs/protocol.md` §4 used to call `selectable.cardIds` "the ids the engine
 * will accept a click on" and §4.1 said "a card is clickable iff its id is in
 * `state.input.selectable.cardIds`". Both are false, and the M3/M4 board was
 * specified on top of them: `InputPassPriority` never calls `setSelectables`, so
 * the commonest interaction in Magic — clicking a card in your own hand at your
 * own main phase — happens while `selectable` is
 * `{cardIds: [], min: 0, max: 0, mode: 'none'}`. A board written to the old rule
 * cannot play a land.
 *
 * So this asserts the shape of the corpus rather than a schema: **most
 * `clickCard` acts name an id that the preceding `input` did not list**, and
 * they were not rejected — Forge answers a click it will not take with
 * `notice {title: 'Not selectable'}`, and those are a small minority. If a
 * future change makes `selectable` list everything clickable, this test fails
 * and the amendment gets re-read; that is cheaper than a reader re-deriving the
 * old rule from a spec that no longer matches the engine.
 */
test('clickCard acts routinely name ids outside input.selectable (amendment M8)', (t) => {
  if (FILES.length === 0) {
    t.skip('no human-seat recording has been made yet');
    return;
  }
  let corpusClicks = 0;
  let corpusOutside = 0;

  for (const file of FILES) {
    const log = load(file);
    let selectable: InputBody['selectable'] = { cardIds: [], min: 0, max: 0, mode: 'none' };
    let clicks = 0;
    let outside = 0;
    let outsideWhileNone = 0;
    let rejected = 0;

    for (const frame of log.frames) {
      if (frame.type === 'input') {
        selectable = (frame.body as InputBody).selectable;
        continue;
      }
      if (frame.type === 'notice') {
        // The engine's own "that click did nothing": IGameController.selectCard
        // returned false (§2.2, §4.1).
        if ((frame.body as { title: string }).title === 'Not selectable') rejected += 1;
        continue;
      }
      if (frame.type !== 'act') continue;
      const act = frame.body as { action: string; cardId?: number };
      if (act.action !== 'clickCard') continue;
      clicks += 1;
      if (!selectable.cardIds.includes(act.cardId!)) {
        outside += 1;
        if (selectable.mode === 'none') outsideWhileNone += 1;
      }
    }

    corpusClicks += clicks;
    corpusOutside += outside;
    assert.ok(clicks > 0, `${file}: no clickCard acts at all — this assertion would be vacuous`);
    assert.equal(
      outside,
      outsideWhileNone,
      `${file}: a clickCard outside selectable.cardIds arrived while mode !== "none". The ` +
        `amendment says the two cases are "an explicit selection is outstanding" and "you have ` +
        `priority"; a third case means §4.1 needs re-reading again.`,
    );
    assert.ok(
      outside > rejected,
      `${file}: ${String(outside)} clickCard acts named an id outside input.selectable.cardIds ` +
        `and ${String(rejected)} clicks were rejected with notice{title:"Not selectable"}. If ` +
        `every out-of-set click were rejected, selectable really would be the clickable set and ` +
        `amendment M8 would be wrong.`,
    );
    t.diagnostic(
      `${file}: ${String(clicks)} clickCard, ${String(outside)} outside selectable ` +
        `(all while mode="none"), ${String(rejected)} rejected by the engine`,
    );
  }

  // The corpus-level claim the amendment makes, so a single future recording
  // with an unusual policy cannot quietly turn this into a no-op.
  assert.ok(
    corpusOutside * 2 > corpusClicks,
    `across ${String(FILES.length)} recordings only ${String(corpusOutside)} of ` +
      `${String(corpusClicks)} clickCard acts named an id outside input.selectable.cardIds. ` +
      `Amendment M8 says this is the MAJORITY case (78 of 86 in ${CANONICAL} when it was ` +
      `written); a corpus that no longer shows it means the engine, the policy or the emitter ` +
      `changed and §4.1 must be re-checked against the engine, not against this test.`,
  );
  t.diagnostic(
    `corpus: ${String(corpusOutside)} of ${String(corpusClicks)} clickCard acts fall outside ` +
      `the preceding input.selectable.cardIds`,
  );
});

test('the corpus contains the human-seat recording PLAN.md names', (t) => {
  // Runs last. The other seeds are welcome; this is the one the plan, the
  // evidence file and `docs/protocol.md` §8.5 will all refer to by name.
  if (FILES.length === 0) {
    t.skip('no human-seat recording has been made yet');
    return;
  }
  assert.ok(
    FILES.includes(CANONICAL),
    `human-seat recordings exist (${FILES.join(', ')}) but ${CANONICAL} is not among them`,
  );
  t.diagnostic(`human-seat recordings: ${FILES.join(', ')}`);
});
