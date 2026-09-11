/*
 * mtg-table — web/test/fixtures.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The contract test between the Java emitter and the TypeScript reducer
 * (synthesis §11, "protocol drift"): every committed frame log under
 * `fixtures/games/` must replay through the real reducer without throwing, end
 * with the game over, and never — not once, not in any frame, not under
 * `events` — carry the name of a card the viewing seat was not allowed to see.
 *
 * A Java-side change that breaks the wire contract fails here, in TypeScript.
 *
 * **`fixtures/games/` only, and only engine-produced logs.** The hand-built
 * `fixtures/synthetic/sample-handwritten.jsonl` is covered by `synthetic.test.ts`
 * instead: it was written from the same reading of `docs/protocol.md` as
 * `protocol.ts`, by the same hand, so it is structurally incapable of detecting
 * drift between the two ends — counting it here inflates the contract corpus with
 * a file that cannot fail for the reason the others can, and it helped a renderer
 * crash pass 36 green tests.
 *
 * **The reducer is not the whole client.** M1 shipped a `TypeError` that blanked
 * the page on the primary fixture because `reduce()` never calls a label
 * function, so `describeEvent` — which the board calls once per event per frame
 * — was never run against real data by any test. It is now, below.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { isFaceDownHidden, isHidden, isRedacted, type AnyCard, type GameStateBody, type StateFrame } from '../src/protocol.ts';
import { initialState, reduce } from '../src/reduce.ts';
import { describeEvent, phaseLabel } from '../src/render/describe.ts';
import { LogReplayTransport, parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES_DIR = fileURLToPath(new URL('../../fixtures/games/', import.meta.url));

function fixtureFiles(): string[] {
  return readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.jsonl'))
    .sort();
}

const files = fixtureFiles();

/**
 * Every `zone` event in the whole corpus whose `from` or `to` is null, collected
 * as the per-file tests run. The M1 blocker was a `TypeError` on exactly these,
 * so the suite asserts the corpus still contains some: a fixture regeneration
 * that quietly stopped producing them would take the regression test's teeth out
 * without failing anything.
 */
const nullZoneLegs: string[] = [];

/**
 * Every face-down card id seen in the corpus (§3.3 gate 2), in either spelling:
 * amendment P3's — a full card with `faceDown: true`, `name: ""` and an `alt`
 * block only where the seat may flip it — or the superseded `faceDownHidden`
 * object, which nothing emits any more. The MSH deck has no morph, so
 * `fixtures/games/morph.jsonl` is the only recording that exercises
 * `canFaceDownBeShownTo` at all; if it is ever dropped, the suite says so
 * instead of silently losing the only evidence for that gate.
 */
const faceDownSeen: string[] = [];

/**
 * Every fixture that turned out to be a **two-deck** recording: one whose
 * opponent owns at least one card name the viewing seat never owns.
 *
 * Until `disjoint.jsonl` was recorded, every committed fixture played the same
 * deck on both seats, which makes every name-based redaction assertion true by
 * coincidence — every name the opponent could leak is also a name the viewer
 * legitimately holds — and made `docs/protocol.md` §8.3's claim that "nowhere in
 * that file does its name exist" untestable on the corpus that is supposed to
 * prove it. The corpus-wide test at the bottom of this file fails if the
 * property is ever lost again.
 */
const twoDeckFixtures: string[] = [];

/**
 * The key sets a `hidden: true` stub is allowed to have.
 *
 * Amendment P1 (report 06 §6.1) added `owner`, because `canBeShownTo`'s
 * `case Hand` compares **controllers** while the zone arrays are keyed by the
 * zone's player: when the two diverge the client otherwise cannot tell whose
 * card it is looking at. An owner id is not identity-bearing.
 *
 * The four-key set is the pre-amendment spelling. It is accepted so a corpus
 * that has not been re-recorded yet still replays — but never silently: the
 * corpus-wide test at the bottom of this file names every file that is still on
 * it. Any SIXTH key, in either spelling, is a leak and fails immediately.
 */
const STUB_KEYS_P1 = ['controller', 'hidden', 'id', 'owner', 'zone'];
const STUB_KEYS_PRE_P1 = ['controller', 'hidden', 'id', 'zone'];

/** Fixtures whose stubs still lack `owner`, and fixtures that carry it. */
const preAmendmentStubs = new Set<string>();
const amendedStubs = new Set<string>();

/** Fixtures whose libraries carry a `cards` array at all (amendment P2). */
const libraryCardsSeen: string[] = [];

/**
 * Fixtures whose libraries carry a **non-empty** `cards` array: a card the
 * viewer may genuinely see in a library, put there by a continuous `MayLookAt`
 * static and by nothing else.
 *
 * Until `future-sight.jsonl` was recorded this was empty for the whole corpus,
 * so P2's renderable half — the only half a renderer can get wrong — was pinned
 * down by a shape assertion and nothing more. `decks/future-sight-probe.dck` is
 * 22 Island + 18 Future Sight for exactly this reason.
 */
const libraryCardsWithContent: string[] = [];

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

function assertStubShape(file: string, card: AnyCard): void {
  const keys = Object.keys(card).sort();
  if (sameList(keys, STUB_KEYS_P1)) {
    amendedStubs.add(file);
    return;
  }
  if (sameList(keys, STUB_KEYS_PRE_P1)) {
    preAmendmentStubs.add(file);
    return;
  }
  assert.fail(
    `${file}: redacted card #${String(card.id)} has keys [${keys.join(', ')}] — §3.3 allows ` +
      `exactly [${STUB_KEYS_P1.join(', ')}]. Anything else is either a leak or drift.`,
  );
}

/** `Card.toString()` in Forge is `name (id)`; this finds the id half. */
const CARD_REF = /\((\d{1,9})\)/g;

/** Forge's engine-debug annotation — `WrappedAbility` appends `" [Label: Name (id)]"`. */
const ENGINE_ANNOTATION = /\[[^[\]]*:[^[\]]*\]\s*$/;

/** Every engine string in one frame: §3.6 rule 1 allows exactly these two. */
function engineTexts(body: GameStateBody): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  body.stack.forEach((item, i) => out.push({ where: `stack[${String(i)}].text`, text: item.text }));
  body.events.forEach((event, i) => {
    if (event.kind === 'cast') out.push({ where: `events[${String(i)}].cast.text`, text: event.text });
  });
  return out;
}

/** Every card object in one frame, wherever it lives. */
function allCards(body: GameStateBody): AnyCard[] {
  const cards: AnyCard[] = [...body.stackCards];
  for (const player of body.players) {
    for (const zone of [
      player.zones.hand,
      player.zones.battlefield,
      player.zones.graveyard,
      player.zones.exile,
      player.zones.command,
    ]) {
      cards.push(...zone.cards);
    }
    // P2: the revealed slice of a library is a real place a card can be, so
    // every card-shaped assertion in this file has to see it too.
    cards.push(...player.zones.library.cards);
  }
  return cards;
}

test('there is at least one committed fixture to replay', () => {
  assert.ok(
    files.length > 0,
    `no *.jsonl under ${FIXTURES_DIR} — record one with ` +
      `./bridge/run.sh mtgtable.RecordMatch --out fixtures/games/g1.jsonl`,
  );
});

for (const file of files) {
  const text = readFileSync(FIXTURES_DIR + file, 'utf8');

  test(`${file}: parses as a frame log with a session header`, () => {
    const log = parseFrameLog(text);
    assert.notEqual(log.header, null, `no session header (§8.1): ${log.warnings.join('; ')}`);
    assert.equal(log.header?.kind, 'session');
    assert.ok(log.frames.length > 0, 'no frames');
    assert.deepEqual(log.warnings, [], 'parser warnings');
  });

  test(`${file}: replays through the reducer without throwing, and ends game over`, () => {
    const log = parseFrameLog(text);
    let state = initialState(log.header);
    for (const frame of log.frames) {
      state = reduce(state, frame);
    }
    assert.equal(state.framesApplied, log.frames.length);
    assert.notEqual(
      state.gameOver,
      null,
      'the final state has no gameOver — the log does not reach the end of a game',
    );
  });

  test(`${file}: opponent hand cards never carry a name, and the stub is the whole shape`, () => {
    const log = parseFrameLog(text);
    const seat = seatOf(log.header?.seat ?? null, log.frames);
    assert.notEqual(seat, null, 'cannot tell which seat this log was redacted for');

    let stateFrames = 0;
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      stateFrames += 1;
      const body = (frame as StateFrame).body;
      for (const player of body.players) {
        if (player.id === seat) continue;
        for (const card of player.zones.hand.cards) {
          assert.ok(
            isRedacted(card),
            `${file}: opponent hand card #${String(card.id)} is not redacted`,
          );
          assertStubShape(file, card);
        }
      }
    }
    assert.ok(stateFrames > 0, 'no state frames in this log');
  });

  test(`${file}: a library carries its count, and only cards the viewer may see (§3.4, P2)`, () => {
    // The amendment (report 06 §0.4): a continuous "may look" static — Future
    // Sight, Bolas's Citadel, Oracle of Mul Daya — reveals library cards through
    // no blocking call at all, so a library that is only a count makes them
    // invisible forever. What it may NOT do is complete the count with stubs:
    // `cards` holds the revealed subset and nothing else.
    const log = parseFrameLog(text);
    const seat = seatOf(log.header?.seat ?? null, log.frames);
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      for (const player of (frame as StateFrame).body.players) {
        const library = player.zones.library;
        assert.equal(typeof library.count, 'number');
        libraryCardsSeen.push(`${file}:p${String(player.id)}`);
        if (library.cards.length > 0) {
          libraryCardsWithContent.push(
            `${file}:p${String(player.id)}:${String(library.cards.length)}`,
          );
        }
        // THE SEAT CHECK (M1 follow-up, 2026-09-11). P2 says `cards` holds the
        // library cards `canBeShownTo(viewer)` allows — and until this line the
        // suite never asked *whose* library. An opponent's library is the single
        // largest hidden-information surface in the game: 30-odd cards, in
        // order, naming the rest of their deck. The shape is legitimately
        // reachable (Opposition Agent, Bribery, Gonti) but no card in any deck
        // under `decks/` reaches it, so for the committed corpus the correct
        // number is zero and any other number is the emitter walking the wrong
        // player's library. `tools/check-redaction.mjs` fails the same thing
        // from the other end, with an explicit `--opponent-library-ok` escape
        // for the recording that one day needs it.
        if (player.id !== seat) {
          assert.equal(
            library.cards.length,
            0,
            `${file}: player ${String(player.id)} is NOT the viewing seat (${String(seat)}) and ` +
              `has ${String(library.cards.length)} full card(s) in library.cards. No deck in ` +
              `decks/ runs a look-at-an-opponent's-library effect, so this is the gate walking ` +
              `the wrong library — the largest leak the protocol allows.`,
          );
        }
        assert.ok(
          library.cards.length <= library.count,
          `${file}: library.cards (${String(library.cards.length)}) exceeds count ` +
            `(${String(library.count)}) for player ${String(player.id)}`,
        );
        for (const card of library.cards) {
          assert.ok(
            !isHidden(card as AnyCard),
            `${file}: library.cards holds a redacted stub (#${String(card.id)}) — a library ` +
              `lists only what canBeShownTo(viewer) allows, never a placeholder`,
          );
        }
      }
    }
  });

  test(`${file}: a face-down card the viewer may not flip carries no real face (P3)`, () => {
    // Report 06 §9 A9. `canBeShownTo` returns true unconditionally on the
    // battlefield and the stack, face-down cards included, so the ONLY thing
    // standing between an opponent's morph and its real name is
    // `canFaceDownBeShownTo` — which is what `alt` is emitted from.
    const log = parseFrameLog(text);
    const seat = seatOf(log.header?.seat ?? null, log.frames);
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      const body: GameStateBody = (frame as StateFrame).body;
      for (const card of allCards(body)) {
        if (isHidden(card)) continue;
        if (card.faceDown !== true) continue;
        faceDownSeen.push(`${file}#${String(card.id)}`);
        const owner = card.owner ?? card.controller;
        assert.equal(
          card.name,
          '',
          `${file}: face-down card #${String(card.id)} carries a name — Forge's face-down ` +
            `state has none, so this came from getAlternateState()`,
        );
        if (owner === seat) continue;
        assert.ok(
          card.alt === null || card.alt === undefined,
          `${file}: face-down card #${String(card.id)} is owned by player ${String(owner)}, ` +
            `not the viewing seat, yet carries an \`alt\` block naming it`,
        );
        if (card.zone !== 'battlefield' && card.zone !== 'stack') {
          // Report 06 §1.4: the 2/2 Creature of getFaceDownCharacteristic is an
          // artifact of the state object, and Forge's own CardStateView returns
          // CardType.EMPTY there. P/T go to null, `types` to "" — §3.2's one
          // spelling of "nothing here", so no renderer branches on absence.
          assert.equal(card.power, null, `${file}: face-down card #${String(card.id)} in ${card.zone} has power`);
          assert.equal(card.toughness, null, `${file}: face-down card #${String(card.id)} in ${card.zone} has toughness`);
          assert.equal(card.types, '', `${file}: face-down card #${String(card.id)} in ${card.zone} has a type line`);
        }
      }
    }
  });

  test(`${file}: no 'name' key appears anywhere under events (§3.6 rule 1)`, () => {
    const log = parseFrameLog(text);
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      const body: GameStateBody = (frame as StateFrame).body;
      const offender = findKey(body.events, 'name');
      assert.equal(offender, null, `${file}: events carry a name at ${String(offender)}`);
    }
  });

  test(`${file}: no engine string names a card concealed in the same frame (§3.6 rule 1)`, () => {
    // THE leak test, and the one the whole corpus was missing: `stack[].text`
    // and `events[].cast.text` are the only strings on the wire that come out
    // of the engine, and for one milestone they were ungated on the assumption
    // that a stack description is public. It is not — a face-down creature's
    // death trigger arrived as "When Ashcloud Phoenix dies, return it to the
    // battlefield face down under your control. [Zone Changer: Ashcloud
    // Phoenix (75)]" in the very frame that serialised card 75 as
    // `faceDownHidden`, naming it twice and printing the id to join the two.
    //
    // Nothing in this suite read the CONTENT of a text field: it asserted key
    // sets and the absence of a key literally named `name`, so the leak passed
    // every test. This reads it.
    const log = parseFrameLog(text);
    const seat = seatOf(log.header?.seat ?? null, log.frames);
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      const body: GameStateBody = (frame as StateFrame).body;
      const concealed = new Map<number, AnyCard>();
      for (const card of allCards(body)) if (isHidden(card)) concealed.set(card.id, card);

      for (const { where, text: line } of engineTexts(body)) {
        for (const match of line.matchAll(CARD_REF)) {
          const id = Number(match[1]);
          const card = concealed.get(id);
          // A card concealed from the OPPONENT is not concealed from the reader
          // of this log; the viewer's own morph may name itself.
          if (card === undefined || card.controller === seat) continue;
          assert.fail(
            `${file}: ${where} mentions card #${String(id)}, which this same frame ` +
              `emitted as ${isRedacted(card) ? 'hidden' : 'faceDownHidden'}: ` +
              `${JSON.stringify(line)}`,
          );
        }
        assert.ok(
          !ENGINE_ANNOTATION.test(line),
          `${file}: ${where} still carries Forge's engine-debug annotation ` +
            `(\`[Label: Name (id)]\`), which Snap.stackText strips: ${JSON.stringify(line)}`,
        );
      }
    }
  });

  test(`${file}: a name only the opponent's deck holds is never printed unbacked`, () => {
    // The half a same-deck recording cannot evidence (§8.3). On a two-deck log
    // every name the opponent owns is unambiguously theirs, so the assertion
    // has content: an engine string may only print such a name in a frame that
    // ALSO shows the viewer a card of that name — i.e. the text never tells you
    // about a card the frame does not already let you see. On a same-deck log
    // the set is empty and this test is deliberately vacuous, which is exactly
    // the fact `twoDeckFixtures` below exists to keep visible.
    const log = parseFrameLog(text);
    const seat = seatOf(log.header?.seat ?? null, log.frames);
    const viewerNames = new Set<string>();
    const opponentNames = new Set<string>();
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      for (const card of allCards((frame as StateFrame).body)) {
        if (isHidden(card)) continue;
        const owner = card.owner ?? card.controller;
        (owner === seat ? viewerNames : opponentNames).add(card.name);
      }
    }
    const opponentOnly = [...opponentNames].filter((name) => name !== '' && !viewerNames.has(name));
    if (opponentOnly.length > 0) twoDeckFixtures.push(`${file} (${String(opponentOnly.length)} names)`);

    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      const body: GameStateBody = (frame as StateFrame).body;
      const visible = new Set<string>();
      for (const card of allCards(body)) if (!isHidden(card)) visible.add(card.name);
      for (const { where, text: line } of engineTexts(body)) {
        for (const name of opponentOnly) {
          if (!line.includes(name)) continue;
          assert.ok(
            visible.has(name),
            `${file}: ${where} prints ${JSON.stringify(name)} — a name only the ` +
              `opponent's deck holds — in a frame where no visible card carries it: ` +
              `${JSON.stringify(line)}`,
          );
        }
      }
    }
  });

  test(`${file}: the session header does not identify the opponent's decklist (§8.1)`, () => {
    const log = parseFrameLog(text);
    const header = log.header;
    assert.notEqual(header, null);
    assert.ok(header!.decks.length > 0, 'no decks in the session header');
    for (const deck of header!.decks) {
      assert.equal(typeof deck.cards, 'number', `deck entry for p${String(deck.player)} has no card count`);
      if (deck.player === header!.seat) {
        assert.equal(typeof deck.path, 'string', "the viewing seat's own deck should be named");
      } else {
        // A path plus a sha256 identifies a decklist exactly, and §8.3 promises
        // the log holds only what this seat was allowed to see. Harmless with
        // two AI seats; the opponent's whole deck the moment a human sits down.
        assert.equal(deck.path, null, `deck entry for p${String(deck.player)} names a file`);
        assert.equal(deck.sha256, null, `deck entry for p${String(deck.player)} carries a sha256`);
      }
    }
  });

  test(`${file}: every event of every frame survives describeEvent (the render half)`, () => {
    const log = parseFrameLog(text);
    let events = 0;
    for (let i = 0; i < log.frames.length; i++) {
      const frame = log.frames[i]!;
      if (frame.type !== 'state') continue;
      const body: GameStateBody = (frame as StateFrame).body;
      for (let e = 0; e < body.events.length; e++) {
        const event = body.events[e]!;
        let line: string;
        try {
          // This is exactly what <EventList> does, once per event per frame.
          line = describeEvent(event);
        } catch (cause) {
          assert.fail(
            `${file}: describeEvent threw on frame ${String(i)} events[${String(e)}] ` +
              `(kind=${event.kind}): ${String(cause)}\n${JSON.stringify(event)}`,
          );
        }
        assert.equal(typeof line, 'string', `${file}: describeEvent returned a non-string`);
        assert.ok(!line.includes('undefined'), `${file}: describeEvent printed "undefined": ${line}`);
        assert.ok(!line.includes('[object'), `${file}: describeEvent printed an object: ${line}`);
        events += 1;
      }
      // The board calls this on every frame too, and §10.5 says phase is null
      // in the pre-game frames.
      assert.equal(typeof phaseLabel(body.phase), 'string');
    }
    assert.ok(events > 0, `${file}: no events at all — the test proves nothing`);
  });

  test(`${file}: a zone event with a null from/to renders rather than throwing`, () => {
    // The M1 blocker in one assertion (§3.6): a token created straight onto the
    // battlefield has `from: null`, and one that ceases to exist has `to: null`.
    // Not every deck makes tokens, so the per-file test has no lower bound —
    // the corpus-wide one below does.
    for (const frame of parseFrameLog(text).frames) {
      if (frame.type !== 'state') continue;
      for (const event of (frame as StateFrame).body.events) {
        if (event.kind !== 'zone') continue;
        if (event.from === null || event.to === null) {
          nullZoneLegs.push(`${file}: ${describeEvent(event)}`);
          assert.match(describeEvent(event), /nowhere/);
        }
      }
    }
  });

  test(`${file}: every card is exactly one of the three shapes in §3.3`, () => {
    const log = parseFrameLog(text);
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      const body: GameStateBody = (frame as StateFrame).body;
      const cards: AnyCard[] = [...body.stackCards];
      for (const player of body.players) {
        for (const zone of [
          player.zones.hand,
          player.zones.battlefield,
          player.zones.graveyard,
          player.zones.exile,
          player.zones.command,
        ]) {
          cards.push(...zone.cards);
        }
      }
      for (const card of cards) {
        if (isFaceDownHidden(card)) faceDownSeen.push(`${file}#${String(card.id)}`);
        const concealed = [isRedacted(card), isFaceDownHidden(card)].filter(Boolean).length;
        assert.ok(concealed <= 1, `card #${String(card.id)} claims both concealed shapes`);
        assert.equal(isHidden(card), concealed === 1, `isHidden disagrees for #${String(card.id)}`);
        if (isRedacted(card)) assertStubShape(file, card);
        if (!isHidden(card)) {
          // §3.2: the one spelling of "no mana cost" is null.
          assert.ok(
            card.manaCost === null || (card.manaCost !== '' && card.manaCost !== 'no cost'),
            `card #${String(card.id)} has manaCost ${JSON.stringify(card.manaCost)}`,
          );
        }
      }
    }
  });

  test(`${file}: every stack item's source card is in stackCards`, () => {
    // §3.3/§10.9 — a spell on the stack is in ZoneType.Stack and therefore in no
    // player zone at all, so before stackCards existed these ids dangled.
    const log = parseFrameLog(text);
    let items = 0;
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      const body: GameStateBody = (frame as StateFrame).body;
      const ids = new Set(body.stackCards.map((c) => c.id));
      for (const item of body.stack) {
        items += 1;
        if (item.sourceCardId === null) continue;
        assert.ok(
          ids.has(item.sourceCardId),
          `stack item #${String(item.id)} points at card #${String(item.sourceCardId)}, ` +
            `which is not in stackCards`,
        );
      }
    }
    assert.ok(items > 0, `${file}: nothing ever went on the stack — the test proves nothing`);
  });

  test(`${file}: stepping back re-derives exactly the state stepping forward produced`, () => {
    const transport = LogReplayTransport.fromText(text);
    const forward: string[] = [];
    while (transport.stepForward()) forward.push(JSON.stringify(transport.state));
    assert.equal(transport.error, null, `reducer rejected a frame: ${transport.error?.message ?? ''}`);
    assert.equal(transport.index, transport.total);

    // Walk all the way back. Each step re-folds from the session header.
    for (let i = forward.length - 1; i >= 1; i--) {
      transport.stepBack();
      assert.equal(transport.index, i);
      assert.equal(
        JSON.stringify(transport.state),
        forward[i - 1],
        `state after stepping back to ${String(i)} differs from the state on the way forward`,
      );
    }
    transport.scrubTo(transport.total);
    assert.equal(JSON.stringify(transport.state), forward.at(-1));
  });
}

/** The viewing seat: the header's, or the `hello_ok` body's `you`. */
function seatOf(headerSeat: number | null, frames: readonly { type: string; body: unknown }[]): number | null {
  if (headerSeat !== null) return headerSeat;
  for (const frame of frames) {
    if (frame.type === 'hello_ok') {
      const you = (frame.body as { you?: unknown }).you;
      if (typeof you === 'number') return you;
    }
  }
  return null;
}

/** Depth-first search for a key anywhere in a JSON value. Returns its path, or null. */
function findKey(value: unknown, key: string, path = 'events'): string | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findKey(value[i], key, `${path}[${String(i)}]`);
      if (hit !== null) return hit;
    }
    return null;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      if (k === key) return `${path}.${k}`;
      const hit = findKey(v, key, `${path}.${k}`);
      if (hit !== null) return hit;
    }
  }
  return null;
}

test('the corpus as a whole still contains zone events with a null from/to', () => {
  // Runs last: node:test executes top-level tests in declaration order, so every
  // per-file test above has already pushed into this.
  assert.ok(
    nullZoneLegs.length > 0,
    'no committed recording has a zone event with a null from/to any more — the ' +
      'M1 blocker (a token entering the battlefield from nowhere) is no longer ' +
      'covered by any fixture. Re-record a deck that makes tokens.',
  );
});

test('the corpus contains a recording whose two seats played DIFFERENT decks', () => {
  // Runs last, after every per-file test has pushed into this.
  //
  // Without one, every name-based redaction assertion in this file is satisfied
  // by coincidence: with the same deck on both seats, every name the opponent
  // could leak is also a name the viewer legitimately holds. That is how a real
  // leak — `cast.text` naming a `faceDownHidden` card and printing its id —
  // passed a green suite. `fixtures/games/disjoint.jsonl` is the fix; record it
  // with:
  //
  //   ./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck \
  //       --deck2 decks/morph-probe.dck --seed 99 --out fixtures/games/disjoint.jsonl
  assert.ok(
    twoDeckFixtures.length > 0,
    'every committed fixture plays the same deck on both seats, so no name-based ' +
      'assertion in this file can distinguish a leak from a coincidence. Record ' +
      'fixtures/games/disjoint.jsonl (--deck decks/pacho-shield.dck --deck2 ' +
      'decks/morph-probe.dck).',
  );
});

test('the corpus still exercises the face-down gate (§3.3 gate 2)', () => {
  assert.ok(
    faceDownSeen.length > 0,
    'no committed recording contains a faceDownHidden card any more. ' +
      '`canBeShownTo` returns true unconditionally on the battlefield, so gate 2 ' +
      'is the only thing keeping a face-down permanent from taking the ' +
      'full-fields branch — and nothing is testing it. Re-record ' +
      'decks/morph-probe.dck.',
  );
});

test('the corpus proves the five-key redacted stub of amendment P1', (t) => {
  // Runs last: every per-file test above has already classified its stubs.
  //
  // A pre-amendment recording is not *wrong* — nothing in it leaks — but it
  // cannot evidence the amendment either, and a corpus that quietly stays on the
  // old shape is how a protocol change ends up documented and unimplemented.
  const stale = [...preAmendmentStubs].sort();
  if (amendedStubs.size === 0) {
    t.diagnostic(
      `every committed recording still emits the four-key stub (no "owner"): ` +
        `${stale.join(', ')}. Re-record them — ./bridge/run.sh mtgtable.RecordMatch ` +
        `--deck decks/pacho-shield.dck --seed 42 --out fixtures/games/g1.jsonl — and this ` +
        `test starts asserting instead of skipping.`,
    );
    t.skip('no re-recorded fixture carries the five-key stub yet');
    return;
  }
  if (stale.length > 0) {
    t.diagnostic(
      `mixed corpus: ${stale.join(', ')} still emit the pre-amendment four-key stub while ` +
        `${[...amendedStubs].sort().join(', ')} carry "owner". Re-record the stragglers.`,
    );
  }
  assert.ok(amendedStubs.size > 0);
});

test('the corpus proves a library can carry revealed cards (amendment P2)', (t) => {
  assert.ok(
    libraryCardsSeen.length > 0,
    'no committed recording emits `library.cards` at all, so §3.4\'s amendment — a library is ' +
      'a count PLUS whatever a continuous "may look" effect reveals — would be documented but ' +
      'unevidenced. Re-record the fixtures against the amended Snap.java.',
  );
  // The content half, which is what a renderer can actually get wrong. A
  // recording made from a deck with no may-look static can only ever show `[]`,
  // so this asserts the corpus still contains one that does.
  assert.ok(
    libraryCardsWithContent.length > 0,
    'every committed fixture has `library.cards: []`. One recording must come from a deck ' +
      'running a continuous MayLookAt static — decks/future-sight-probe.dck, recorded as ' +
      'fixtures/games/future-sight.jsonl — or P2 is only ever proved by its own absence.',
  );
  t.diagnostic(`library.cards carries content in: ${libraryCardsWithContent.slice(0, 6).join(', ')}`);
});
