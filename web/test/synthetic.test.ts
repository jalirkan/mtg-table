/*
 * mtg-table — web/test/synthetic.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The hand-built fixtures under `fixtures/synthetic/`.
 *
 * These are **not** the drift contract — `fixtures.test.ts` is, and it globs
 * `fixtures/games/` (engine-produced) only. A file written by the same hand as
 * `protocol.ts`, from the same reading of `docs/protocol.md`, cannot detect a
 * disagreement between the Java emitter and the TypeScript reducer; it can only
 * confirm that one author was self-consistent. Keeping it in the contract suite
 * inflated the count of recordings that can actually detect drift.
 *
 * What it *can* do is carry the shapes an AI-vs-AI recording never produces —
 * `input`, all eleven `ask` kinds, `answer`, a face-down card in three different
 * positions, a library with a revealed card in it, the three P4 event kinds no
 * engine fixture fires, and a `zone` event with a null `to` — and this file
 * asserts that it still does, so the coverage cannot quietly evaporate the next
 * time `tools/make-sample-fixture.mjs` is edited.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  ASK_KINDS,
  FRAME_TYPES,
  altFace,
  isFaceDown,
  isFaceDownHidden,
  isHidden,
  type AnyCard,
  type AskBody,
  type AskOption,
  type Card,
  type GameStateBody,
  type InputBody,
  type StateFrame,
} from '../src/protocol.ts';
import { initialState, reduce } from '../src/reduce.ts';
import { describeEvent, stackTextLabel } from '../src/render/describe.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const DIR = fileURLToPath(new URL('../../fixtures/synthetic/', import.meta.url));
const FILE = 'sample-handwritten.jsonl';

test('fixtures/synthetic holds only hand-built logs, and the sample is one of them', () => {
  const files = readdirSync(DIR).filter((name) => name.endsWith('.jsonl'));
  assert.ok(files.includes(FILE), `${FILE} is missing from ${DIR}`);
});

const text = readFileSync(DIR + FILE, 'utf8');

test(`${FILE}: replays through the real reducer without throwing`, () => {
  const log = parseFrameLog(text);
  assert.deepEqual(log.warnings, [], 'parser warnings');
  let state = initialState(log.header);
  for (const frame of log.frames) state = reduce(state, frame);
  assert.equal(state.framesApplied, log.frames.length);
  assert.notEqual(state.gameOver, null);
});

test(`${FILE}: every event survives describeEvent`, () => {
  const log = parseFrameLog(text);
  for (const frame of log.frames) {
    if (frame.type !== 'state') continue;
    for (const event of (frame as StateFrame).body.events) {
      const line = describeEvent(event);
      assert.equal(typeof line, 'string');
      assert.ok(!line.includes('undefined'), `describeEvent printed "undefined": ${line}`);
      // §3.6 rule 1: a concealed `cast.text` is `""` on the wire, and the client
      // labels the absence rather than printing a description that stops dead.
      assert.ok(!line.endsWith(': '), `describeEvent printed an empty description: ${line}`);
    }
  }
});

test(`${FILE}: carries a concealed engine string (§3.6 rule 1)`, () => {
  // `stack[].text` and `cast.text` are `""` when the bridge concealed them.
  // Real recordings do produce these (10 of disjoint.jsonl's 41 engine strings),
  // but this file is where the renderer's label for the absence is pinned down.
  const log = parseFrameLog(text);
  let concealedStack = 0;
  let concealedCast = 0;
  for (const frame of log.frames) {
    if (frame.type !== 'state') continue;
    const body: GameStateBody = (frame as StateFrame).body;
    for (const item of body.stack) if (item.text === '') concealedStack += 1;
    for (const event of body.events) if (event.kind === 'cast' && event.text === '') concealedCast += 1;
  }
  assert.ok(concealedStack > 0, 'no concealed stack[].text — stackTextLabel is untested');
  assert.ok(concealedCast > 0, 'no concealed cast.text — stackTextLabel is untested');
  assert.equal(stackTextLabel(''), '(hidden)');
  assert.equal(stackTextLabel('Morph - Creature 2/2'), 'Morph - Creature 2/2');
});

test(`${FILE}: still carries the shapes an AI-vs-AI recording cannot produce`, () => {
  const log = parseFrameLog(text);

  const types = new Set(log.frames.map((frame) => frame.type));
  for (const wanted of ['input', 'ask', 'answer', 'act'] as const) {
    assert.ok(types.has(wanted), `no ${wanted} frame — §10.7 says only this file has one`);
  }

  let faceDown = 0;
  let nullFrom = 0;
  let nullTo = 0;
  let stackCards = 0;
  for (const frame of log.frames) {
    if (frame.type !== 'state') continue;
    const body: GameStateBody = (frame as StateFrame).body;
    stackCards += body.stackCards.length;
    const cards: AnyCard[] = [...body.stackCards];
    for (const player of body.players) cards.push(...player.zones.battlefield.cards);
    for (const card of cards) {
      if (!isFaceDown(card)) continue;
      faceDown += 1;
      if (isFaceDownHidden(card)) {
        // The superseded eleven-key `faceDownHidden` shape (amendment P3). This
        // file no longer emits one and no emitter does, but the reader stays
        // total over it so a log recorded before 2026-09-11 still replays — and
        // if one ever reappears, it had better still not carry an identity.
        for (const key of ['name', 'setCode', 'manaCost', 'types', 'owner', 'abilities']) {
          assert.ok(!(key in card), `face-down card #${String(card.id)} carries "${key}"`);
        }
        continue;
      }
      // Amendment P3's spelling: a full card read from getCurrentState(), whose
      // name is "" — with the real face in `alt` ONLY when this seat may flip it.
      assert.ok(!isHidden(card));
      assert.equal(card.name, '', `face-down card #${String(card.id)} carries a name`);
      const alt = altFace(card);
      if (alt !== null) {
        assert.equal(typeof alt.name, 'string');
        assert.notEqual(alt.name, '', 'an `alt` block with no name is not a reveal');
      }
    }
    for (const event of body.events) {
      if (event.kind !== 'zone') continue;
      if (event.from === null) nullFrom += 1;
      if (event.to === null) nullTo += 1;
    }
  }

  assert.ok(faceDown > 0, 'no face-down card — the only fixture that has one has lost it');
  assert.ok(nullFrom > 0, 'no zone event with a null `from`');
  assert.ok(nullTo > 0, 'no zone event with a null `to` — no real fixture covers this leg');
  assert.ok(stackCards > 0, 'no stackCards — §3.3 is then untested here');
});

test(`${FILE}: carries all eleven ask kinds, each with the answer that closes it`, () => {
  // §5.2. An AI-vs-AI recording has no `ask` at all, so without this file M2's
  // WireGuiGame would be built against a table in a document and nothing else.
  const log = parseFrameLog(text);
  const seen = new Map<string, string>();
  const answered = new Set<string>();
  for (const frame of log.frames) {
    if (frame.type === 'ask') {
      const body = frame.body as AskBody;
      seen.set(body.kind, body.askId);
    } else if (frame.type === 'answer') {
      answered.add((frame.body as { askId: string }).askId);
    }
  }
  assert.deepEqual(
    [...seen.keys()].sort(),
    [...ASK_KINDS].sort(),
    'the sample must exercise every ask kind the protocol declares — and only those',
  );
  for (const [kind, askId] of seen) {
    assert.ok(answered.has(askId), `ask ${kind} (${askId}) has no answer frame`);
  }
});

test(`${FILE}: order answers {ordered, remember} and a reveal answers []`, () => {
  // §5.3, the two kinds a reader gets wrong: `order` is not top/bottom and is
  // never null; `choose_list` with `reveal: true` is acknowledge-only.
  const log = parseFrameLog(text);
  const askById = new Map<string, AskBody>();
  let sawOrder = false;
  let sawReveal = false;
  for (const frame of log.frames) {
    if (frame.type === 'ask') {
      const body = frame.body as AskBody;
      askById.set(body.askId, body);
      continue;
    }
    if (frame.type !== 'answer') continue;
    const { askId, value } = frame.body as { askId: string; value: unknown };
    const ask = askById.get(askId);
    assert.ok(ask !== undefined, `answer for an unknown askId ${askId}`);
    if (ask.kind === 'order') {
      sawOrder = true;
      assert.notEqual(value, null, 'an `order` answer is never null (§5.3)');
      const v = value as { ordered: number[]; remember: boolean };
      assert.equal(typeof v.remember, 'boolean');
      assert.equal(v.ordered.length, ask.dest.length + ask.source.length,
        'order indices address `dest ++ source` as one array');
    }
    if (ask.kind === 'choose_list' && ask.reveal) {
      sawReveal = true;
      assert.deepEqual(value, [], 'a reveal is acknowledge-only: the answer is []');
    }
  }
  assert.ok(sawOrder, 'no `order` ask — §5.3\'s OrderResult shape is then untested');
  assert.ok(sawReveal, 'no `choose_list` with reveal — the "pick -1 cards" trap is untested');
});

test(`${FILE}: option ids are ask-local indices into ONE server-side array`, () => {
  // §5.1: `id` is an index into the server's `pendingOpts` array for this
  // `askId`, NOT a Forge id — `Integer 3` and `CardView 3` would otherwise
  // collide. When a kind carries two lists (`order`'s dest/source, `sideboard`'s
  // main/side) they index the SAME array, which is why `order`'s answer
  // addresses `dest ++ source` as one thing (§5.3). And every card inside an ask
  // body comes from the one serialising function, so a concealed one is a
  // five-key stub here exactly as it is in `state`.
  const LISTS: Record<string, string[]> = {
    order: ['dest', 'source'],
    sideboard: ['main', 'side'],
  };
  const log = parseFrameLog(text);
  let options = 0;
  for (const frame of log.frames) {
    if (frame.type !== 'ask') continue;
    const body = frame.body as unknown as Record<string, unknown>;
    const keys = LISTS[String(body.kind)] ?? ['options', 'targets', 'cards'];
    const flat: AskOption[] = keys.flatMap((key) =>
      Array.isArray(body[key]) ? (body[key] as AskOption[]) : []);
    if (flat.length === 0) continue;
    flat.forEach((option, i) => {
      options += 1;
      assert.equal(option.id, i,
        `${String(body.kind)} option "${option.label}" has id ${String(option.id)}, but it is ` +
          `entry ${String(i)} of ${keys.join(' ++ ')}`);
      assert.equal(typeof option.label, 'string');
      assert.ok(option.label.length > 0, 'an option with no label renders as nothing');
      if (option.card !== undefined && isHidden(option.card)) {
        assert.equal(Object.keys(option.card).length, 5, 'a stub in an ask body is still 5 keys');
      }
    });
  }
  assert.ok(options > 20, `only ${String(options)} options across every ask`);
});

test(`${FILE}: input carries a focusCard that is NOT in the snapshot, plus weak and openZones`, () => {
  // §4 / amendment P7. `setCard` and `setPanelSelection` are pushed with library
  // cards, so an id alone renders blank — which is the whole reason `focusCard`
  // exists. No engine recording can show this: it needs a human seat.
  const log = parseFrameLog(text);
  const inputs = log.frames.filter((frame) => frame.type === 'input')
    .map((frame) => frame.body as InputBody);
  assert.ok(inputs.length >= 2, 'one input frame cannot show both the empty and the filled hint');

  const inSnapshot = new Set<number>();
  for (const frame of log.frames) {
    if (frame.type !== 'state') continue;
    const body: GameStateBody = (frame as StateFrame).body;
    for (const player of body.players) {
      for (const [name, zone] of Object.entries(player.zones)) {
        if (name === 'library') continue;
        for (const card of (zone as { cards: AnyCard[] }).cards) inSnapshot.add(card.id);
      }
    }
  }

  const withFocus = inputs.find((input) => input.focusCard !== null);
  assert.ok(withFocus !== undefined, 'no input carries a focusCard');
  assert.equal(withFocus.focusCard?.id, withFocus.focusCardId);
  assert.ok(
    !inSnapshot.has(withFocus.focusCard?.id ?? -1),
    'the focusCard is in the snapshot, so this fixture does not show why focusCard exists',
  );
  assert.ok(inputs.some((input) => input.weak.length > 0), 'no input exercises `weak`');
  const hint = inputs.flatMap((input) => input.openZones)[0];
  assert.ok(hint !== undefined, 'no input carries an openZones hint (§4.3)');
  assert.equal(typeof hint.playerId, 'number');
  assert.ok(hint.zones.length > 0);
  // §4.2, the invariant that stalls a button-only client.
  assert.ok(
    inputs.some((input) => !input.buttons.ok.enabled && input.selectable.cardIds.length > 0),
    'no input has a disabled OK with selectable cards — §4.2 is then unexercised',
  );
});

test(`${FILE}: a library carries a revealed card, and a face-down card outside play has no body`, () => {
  const log = parseFrameLog(text);
  const seat = log.header?.seat ?? null;
  let revealed = 0;
  let faceDownOutsidePlay = 0;
  for (const frame of log.frames) {
    if (frame.type !== 'state') continue;
    const body: GameStateBody = (frame as StateFrame).body;
    for (const player of body.players) {
      // The seat check, matching `fixtures.test.ts` and `check-redaction.mjs`'s
      // A3: an opponent's library is the largest hidden-information surface in
      // the game, so the hand-built fixture must not normalise the shape of a
      // leak by carrying one "for coverage".
      if (player.id !== seat) {
        assert.equal(
          player.zones.library.cards.length,
          0,
          `player ${String(player.id)} is not the viewing seat (${String(seat)}) and has full ` +
            `cards in library.cards`,
        );
      }
      // §3.4 / P2 — the renderable half. `future-sight.jsonl` is the engine's
      // evidence for the same shape; this is the renderer's.
      for (const card of player.zones.library.cards) {
        revealed += 1;
        assert.equal(card.zone, 'library');
        assert.ok(!isHidden(card as AnyCard), 'library.cards never holds a stub');
      }
      for (const [name, zone] of Object.entries(player.zones)) {
        if (name === 'library' || name === 'battlefield') continue;
        for (const card of (zone as { cards: AnyCard[] }).cards) {
          if (!isFaceDown(card) || isHidden(card)) continue;
          faceDownOutsidePlay += 1;
          // §3.2: CardStateView.getType() is CardType.EMPTY outside play and the
          // 2/2 is an artifact of the face-down state object, so there is no
          // public body at all — and no `alt`, because canFaceDownBeShownTo ends
          // isInZone(Battlefield, Stack, Sideboard).
          const full = card as Card;
          assert.equal(full.types, '', `face-down #${String(card.id)} in ${name} has a type line`);
          assert.equal(full.power, null);
          assert.equal(full.toughness, null);
          assert.equal(altFace(card), null);
        }
      }
    }
  }
  assert.ok(revealed > 0, 'no revealed library card — P2 has no renderer evidence here');
  assert.ok(
    faceDownOutsidePlay > 0,
    'no face-down card outside battlefield/stack: no engine fixture has one either, so ' +
      '§3.2\'s "no public body outside play" rule would be proved only by its absence',
  );
});

test(`${FILE}: carries all eleven frame types of §2, and a token (P15)`, () => {
  // An AI-vs-AI recording is `hello_ok` + a run of `state` + `over` (§8.4), so
  // `notice`, `ping`, `pong` and `resync` had a branch in `reduce()` and no
  // artifact behind it — they were reachable only from frames hand-built inside
  // a unit test, which is not the same thing as a log the transport parses.
  const log = parseFrameLog(text);
  const types = new Set(log.frames.map((frame) => frame.type));
  // M59's `table` is sent only at a table of two (§2.6), and this sample is a
  // game against the AI, where a `table` frame would be a wrong frame; its
  // artifact is a two-person recording (gate step 10i, check-redaction).
  assert.ok((FRAME_TYPES as readonly string[]).includes('table'));
  assert.deepEqual(
    [...types].sort(),
    FRAME_TYPES.filter((t) => t !== 'table').sort(),
    'the sample must carry one of every frame type §2 declares for a game against the AI — and only those',
  );

  // P15 — `CardView.isToken()`. `g1.jsonl` has 694 of them, so the emitter's
  // evidence is elsewhere; this is the renderer's, and it is the card the
  // null-`from` zone event created.
  const tokens: Card[] = [];
  for (const frame of log.frames) {
    if (frame.type !== 'state') continue;
    for (const player of (frame as StateFrame).body.players) {
      for (const card of player.zones.battlefield.cards) {
        if (!isHidden(card) && card.token) tokens.push(card);
      }
    }
  }
  assert.ok(tokens.length > 0, 'no token — P15 has no renderer evidence in this file');
  for (const token of tokens) {
    // §3.2: a token has no printing behind it, so `manaCost` is null and an
    // art miss for it is expected rather than a hole in art.json.
    assert.equal(token.manaCost, null, `token #${String(token.id)} has a mana cost`);
  }
  const created = new Set<number>();
  for (const frame of log.frames) {
    if (frame.type !== 'state') continue;
    for (const event of (frame as StateFrame).body.events) {
      if (event.kind === 'zone' && event.from === null) created.add(event.cardId);
    }
  }
  assert.ok(
    tokens.some((token) => created.has(token.id)),
    'no token is the subject of the null-`from` zone event, so the event that says "a token ' +
      'came from nowhere" and the card it created are in different frames — which is exactly ' +
      'the join a renderer needs and cannot test',
  );
});

test(`${FILE}: fires the three P4 event kinds no engine recording produces`, () => {
  // Amendment P4 added four kinds. `scry` fires three times in g1; `surveil`,
  // `phased` and `foretold` never fire in any recording the corpus has, so this
  // is the only place the reducer and `describeEvent` meet them.
  const log = parseFrameLog(text);
  const kinds = new Set<string>();
  for (const frame of log.frames) {
    if (frame.type !== 'state') continue;
    for (const event of (frame as StateFrame).body.events) kinds.add(event.kind);
  }
  for (const wanted of ['scry', 'surveil', 'phased', 'foretold']) {
    assert.ok(kinds.has(wanted), `no ${wanted} event — amendment P4's kind is unexercised`);
  }
});
