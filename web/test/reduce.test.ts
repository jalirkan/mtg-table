/*
 * mtg-table — web/test/reduce.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Run with `npm test` in web/ (Node 24 strips the types; there is no build step).
 *
 * These cover the unknown-frame policy of docs/protocol.md §1, which is the only
 * thing standing between two hand-written ends and silent protocol drift.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  eventIds,
  initialState,
  MAX_LOG_ENTRIES,
  MAX_NOTICES,
  reduce,
  replayFrames,
} from '../src/reduce.ts';
import { EVENT_KINDS, type Frame, type GameEvent } from '../src/protocol.ts';

function frame(overrides: Record<string, unknown>): Frame {
  return { v: 1, seq: 1, t: 1757600000000, type: 'notice', body: {}, ...overrides } as unknown as Frame;
}

test('a protocol-major mismatch throws and names the frame', () => {
  const state = initialState();
  const bad = frame({ v: 2, seq: 17, type: 'state', body: {} });
  assert.throws(
    () => reduce(state, bad),
    (err: Error) => {
      assert.match(err.message, /protocol major mismatch/);
      assert.match(err.message, /v=2/);
      assert.match(err.message, /#17/);
      assert.match(err.message, /"state"/);
      return true;
    },
  );
});

test('an unknown frame type throws rather than being ignored', () => {
  assert.throws(
    () => reduce(initialState(), frame({ seq: 4, type: 'state_patch', body: {} })),
    (err: Error) => {
      assert.match(err.message, /unknown frame type/);
      assert.match(err.message, /"state_patch"/);
      assert.match(err.message, /#4/);
      return true;
    },
  );
});

test('an unknown ask.kind throws — a blocked game thread must never be silent', () => {
  assert.throws(
    () =>
      reduce(
        initialState(),
        frame({ seq: 9, type: 'ask', body: { askId: 'a1', kind: 'pick_a_door', timeoutMs: 1000 } }),
      ),
    (err: Error) => {
      assert.match(err.message, /unknown ask\.kind/);
      assert.match(err.message, /"pick_a_door"/);
      return true;
    },
  );
});

test('input and ask are merged into the one state object', () => {
  let state = initialState();
  state = reduce(
    state,
    frame({
      seq: 1,
      type: 'input',
      body: {
        prompt: 'Declare blockers',
        focusCardId: null,
        buttons: { ok: { label: 'OK', enabled: false }, cancel: { label: 'Cancel', enabled: true } },
        selectable: { cardIds: [31, 32], min: 0, max: 2, mode: 'cards' },
        highlighted: [],
      },
    }),
  );
  assert.equal(state.input?.prompt, 'Declare blockers');
  assert.equal(state.input?.buttons.ok.enabled, false);

  state = reduce(
    state,
    frame({
      seq: 2,
      type: 'ask',
      body: { askId: 'a7', kind: 'confirm', timeoutMs: 120000, prompt: 'Really?', yesLabel: 'Y', noLabel: 'N' },
    }),
  );
  assert.equal(state.ask?.askId, 'a7');
  // The input is still there: an ask does not replace it.
  assert.equal(state.input?.prompt, 'Declare blockers');

  // Exactly one answer per ask; it clears the question.
  state = reduce(state, frame({ seq: 3, type: 'answer', body: { askId: 'a7', value: true } }));
  assert.equal(state.ask, null);
});

test('an answer for some other askId is ignored', () => {
  let state = initialState();
  state = reduce(
    state,
    frame({
      type: 'ask',
      body: { askId: 'a7', kind: 'text', timeoutMs: 1000, prompt: 'Name a card', initial: '' },
    }),
  );
  state = reduce(state, frame({ type: 'answer', body: { askId: 'a6', value: 'Plains' } }));
  assert.equal(state.ask?.askId, 'a7');
});

test('notices append and cap at MAX_NOTICES', () => {
  let state = initialState();
  for (let i = 0; i < MAX_NOTICES + 10; i++) {
    state = reduce(
      state,
      frame({ seq: i, type: 'notice', body: { level: 'info', title: `t${String(i)}`, text: 'x' } }),
    );
  }
  assert.equal(state.notices.length, MAX_NOTICES);
  // The oldest ten fell off the front, the newest is last.
  assert.equal(state.notices[0]?.title, 't10');
  assert.equal(state.notices.at(-1)?.title, `t${String(MAX_NOTICES + 9)}`);
});

test('over sets gameOver and clears any outstanding ask', () => {
  let state = initialState();
  state = reduce(
    state,
    frame({
      type: 'ask',
      body: { askId: 'a1', kind: 'confirm', timeoutMs: 1000, prompt: 'p', yesLabel: 'y', noLabel: 'n' },
    }),
  );
  state = reduce(
    state,
    frame({ type: 'over', body: { winner: 0, reason: 'Opponent has lost the game.', matchOver: false } }),
  );
  assert.equal(state.gameOver?.winner, 0);
  assert.equal(state.ask, null);
});

test('gameOver is sticky: a later snapshot with gameOver null does not un-end the game', () => {
  let state = initialState();
  state = reduce(
    state,
    frame({ type: 'over', body: { winner: 1, reason: 'You have lost the game.', matchOver: true } }),
  );
  state = reduce(state, frame({ type: 'state', body: minimalState() }));
  assert.equal(state.gameOver?.winner, 1);
});

test('unknown event kinds are dropped, not thrown (§3.6 rule 3 — the one exception)', () => {
  const body = minimalState();
  body['events'] = [
    { kind: 'turn', player: 0, turn: 1 },
    { kind: 'teleport', cardId: 5 },
  ];
  const state = reduce(initialState(), frame({ type: 'state', body }));
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0]?.kind, 'turn');
  assert.deepEqual(state.droppedEventKinds, ['teleport']);
});

test('the pre-game frame (§10.5: turn 0, phase/active/priority null) reduces cleanly', () => {
  const body = minimalState();
  body['turn'] = 0;
  body['round'] = 0;
  body['phase'] = null;
  body['activePlayer'] = null;
  body['priority'] = null;
  const state = reduce(initialState(), frame({ type: 'state', body }));
  assert.equal(state.board?.turn, 0);
  assert.equal(state.board?.phase, null);
  assert.equal(state.board?.activePlayer, null);
  assert.equal(state.gameOver, null);
});

test('reduce does not mutate the state it is given', () => {
  const before = initialState();
  const snapshot = JSON.stringify(before);
  reduce(before, frame({ type: 'notice', body: { level: 'warn', title: 'x', text: 'y' } }));
  assert.equal(JSON.stringify(before), snapshot);
});

function minimalState(): Record<string, unknown> {
  return {
    gameId: 'g',
    turn: 1,
    round: 1,
    phase: 'MAIN1',
    activePlayer: 0,
    priority: 0,
    gameOver: null,
    players: [],
    stack: [],
    stackCards: [],
    combat: null,
    events: [],
  };
}

// ---------------------------------------------------------------------------
// The amendments of 2026-09-11 (docs/research/06 §6, 07 §1).
// ---------------------------------------------------------------------------

test('P5: a hidden card REPLACES the client card for that id — it never merges', () => {
  // §9 invariant 10 / report 06 §0.6: "the worst remaining leak is in reduce.ts,
  // not in Snap.java". Forge card ids are stable across zone changes, so a
  // reducer that merged card objects by id would keep the name it learned while
  // the opponent's hand was legitimately revealed (a tempShowCards window lasts
  // exactly as long as one dialog) and keep rendering it afterwards.
  //
  // Frame 1: card 42 is revealed, in the opponent's hand, with its name.
  // Frame 2: the same id, same zone, redacted. Nothing may survive.
  const revealed = minimalState();
  revealed['players'] = [
    player(1, {
      hand: {
        count: 1,
        cards: [
          {
            id: 42,
            name: 'Quantum Reduction',
            setCode: 'MSH',
            manaCost: '{1}{U}',
            types: 'Instant',
            power: null,
            toughness: null,
            loyalty: null,
            damage: 0,
            counters: {},
            tapped: false,
            sick: false,
            attacking: false,
            blocking: false,
            faceDown: false,
            token: false,
            alt: null,
            attachedToId: null,
            attachmentIds: [],
            controller: 1,
            owner: 1,
            zone: 'hand',
            abilities: [],
          },
        ],
      },
    }),
  ];

  const concealed = minimalState();
  concealed['players'] = [
    player(1, {
      // P1: five keys, and not one of them identity-bearing.
      hand: { count: 1, cards: [{ id: 42, zone: 'hand', owner: 1, controller: 1, hidden: true }] },
    }),
  ];

  let state = reduce(initialState(), frame({ seq: 1, type: 'state', body: revealed }));
  const before = JSON.stringify(state.board);
  assert.ok(before.includes('Quantum Reduction'), 'the reveal frame did not carry the name');

  state = reduce(state, frame({ seq: 2, type: 'state', body: concealed }));
  const after = JSON.stringify(state);

  assert.ok(
    !after.includes('Quantum Reduction'),
    'the name of card 42 survived a frame that redacted it — the reducer is merging by id',
  );
  const card = state.board?.players[0]?.zones.hand.cards[0];
  assert.equal(card?.id, 42);
  assert.deepEqual(
    Object.keys(card ?? {}).sort(),
    ['controller', 'hidden', 'id', 'owner', 'zone'],
    'the redacted card gained keys on the way through reduce()',
  );
});

test('P4: the four new event kinds are known, and an invented one is still dropped', () => {
  const body = minimalState();
  body['events'] = [
    { kind: 'scry', player: 0, toTop: 2, toBottom: 1 },
    { kind: 'surveil', player: 1, toLibrary: 1, toGraveyard: 2 },
    { kind: 'phased', cardId: 7, phasedOut: true },
    { kind: 'foretold', player: 0 },
    { kind: 'teleport', cardId: 5 },
  ];
  const state = reduce(initialState(), frame({ seq: 3, type: 'state', body }));
  assert.deepEqual(
    state.events.map((e) => e.kind),
    ['scry', 'surveil', 'phased', 'foretold'],
  );
  assert.deepEqual(state.droppedEventKinds, ['teleport']);
});

test('P6: open_zones is gone — an ask that still carries it throws', () => {
  // It became the non-blocking `input.openZones` hint, so a bridge that still
  // emits it as a question is blocking the game thread on something this client
  // will never answer. That must be loud (§1), not ignored.
  assert.throws(
    () =>
      reduce(
        initialState(),
        frame({
          seq: 5,
          type: 'ask',
          body: { askId: 'a1', kind: 'open_zones', timeoutMs: 1000, playerId: 1, zones: ['graveyard'] },
        }),
      ),
    /unknown ask\.kind.*open_zones/s,
  );
});

test('P6: input carries openZones / focusCard / weak without any of them blocking', () => {
  const state = reduce(
    initialState(),
    frame({
      seq: 6,
      type: 'input',
      body: {
        prompt: 'Choose a card to discard',
        focusCardId: 42,
        focusCard: { id: 42, zone: 'library', owner: 0, controller: 0, hidden: true },
        buttons: { ok: { label: 'OK', enabled: false }, cancel: { label: 'Cancel', enabled: true } },
        selectable: { cardIds: [42], min: 1, max: 1, mode: 'cards' },
        highlighted: [],
        weak: [17, 17],
        openZones: [{ playerId: 1, zones: ['graveyard', 'exile'] }],
      },
    }),
  );
  assert.equal(state.ask, null, 'an openZones hint must never become a blocking question');
  assert.equal(state.input?.openZones?.[0]?.playerId, 1);
  assert.deepEqual(state.input?.weak, [17, 17]);
  assert.equal(state.input?.focusCard?.id, 42);
});

test('P20: the log ring folds every frame, caps at MAX_LOG_ENTRIES and re-derives on replay', () => {
  const frames: Frame[] = [];
  for (let i = 1; i <= 300; i++) {
    const body = minimalState();
    body['events'] = [
      { kind: 'turn', player: i % 2, turn: i },
      { kind: 'tap', cardId: i, tapped: true },
    ];
    frames.push(frame({ seq: i, type: 'state', body }));
  }
  let state = initialState();
  for (const f of frames) state = reduce(state, f);

  assert.equal(state.log.length, MAX_LOG_ENTRIES, 'the ring did not cap');
  // Oldest first, and the newest entry is the last event of the last frame.
  assert.equal(state.log.at(-1)?.kind, 'tap');
  assert.deepEqual(state.log.at(-1)?.cardIds, [300]);
  assert.equal(state.log.at(-1)?.seq, 300);
  // Ids only: nothing in the ring can carry a name, because events cannot.
  assert.ok(!JSON.stringify(state.log).includes('name'));

  // The reason it lives in the reducer: replaying a prefix reproduces the ring
  // exactly, so the replay transport's "step back" cannot leave the log ahead of
  // the board.
  const prefix = replayFrames(frames, 10);
  assert.equal(prefix.log.length, 20);
  assert.deepEqual(prefix.log.at(-1)?.cardIds, [10]);
});

test('P20: eventIds is total over every event kind the protocol allows', () => {
  // The log ring calls this once per event per frame; a throw in here would
  // unmount the board, which is exactly the failure mode describeEvent had.
  const samples: GameEvent[] = [
    { kind: 'zone', cardId: 1, from: null, to: { zone: 'battlefield', player: 0 } },
    { kind: 'cast', stackId: 2, cardId: 3, controller: 0, text: '' },
    { kind: 'resolved', cardId: 3, fizzled: false },
    { kind: 'unstacked', cardId: 3 },
    { kind: 'attackers', player: 0, bands: [{ defender: null, attackerIds: [4] }] },
    { kind: 'blockers', defendingPlayer: 1, blocks: [{ attackerId: 4, blockerIds: [5] }] },
    { kind: 'damage', target: { kind: 'player', id: 1 }, sourceCardId: 4, amount: 2, combat: true, damageType: null },
    { kind: 'life', player: 1, from: 20, to: 18 },
    { kind: 'poison', player: 1, sourcePlayer: null, from: 0, amount: 1 },
    { kind: 'tap', cardId: 6, tapped: true },
    { kind: 'counters', cardId: 6, counter: 'P1P1', from: 0, to: 1 },
    { kind: 'attach', cardId: 7, to: null },
    { kind: 'sacrificed', cardId: 8 },
    { kind: 'land', player: 0, cardId: 9 },
    { kind: 'stats', cardIds: [10, 11], transform: false },
    { kind: 'turn', player: 0, turn: 3 },
    { kind: 'phase', player: 0, phase: 'MAIN1' },
    { kind: 'combat_end', attackerIds: [], blockerIds: [] },
    { kind: 'shuffle', player: 0 },
    { kind: 'mulligan', player: 1 },
    { kind: 'outcome', winner: null, lastTurn: 9 },
    { kind: 'scry', player: 0, toTop: 1, toBottom: 0 },
    { kind: 'surveil', player: 0, toLibrary: 1, toGraveyard: 1 },
    { kind: 'phased', cardId: 12, phasedOut: false },
    { kind: 'foretold', player: 1 },
  ];
  assert.equal(samples.length, EVENT_KINDS.length, 'a kind was added without a sample here');
  for (const event of samples) {
    const { cardIds, playerIds } = eventIds(event);
    assert.ok(Array.isArray(cardIds) && cardIds.every((n) => typeof n === 'number'), event.kind);
    assert.ok(Array.isArray(playerIds) && playerIds.every((n) => typeof n === 'number'), event.kind);
  }
});

/** A player with only the zones a test needs, the rest empty. */
function player(id: number, zones: Record<string, unknown>): Record<string, unknown> {
  const empty = { count: 0, cards: [] };
  return {
    id,
    name: `p${String(id)}`,
    isAi: true,
    life: 20,
    poison: 0,
    counters: {},
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    zones: {
      hand: empty,
      battlefield: empty,
      graveyard: empty,
      exile: empty,
      command: empty,
      library: { count: 30 },
      ...zones,
    },
  };
}
