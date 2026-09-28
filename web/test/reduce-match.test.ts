/*
 * mtg-table — web/test/reduce-match.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Match setup (docs/protocol.md §2.1, amendment M44): `hello_ok.match` through
 * the fold and out of its one reader, `seatMatchOf`.
 *
 * The three claims worth pinning:
 *
 *   1. the viewing seat reads `yourDeck`, every other seat `aiDeck`, and only a
 *      seat `players[]` marks `isAi` gets a profile;
 *   2. the field is OPTIONAL — every committed engine recording predates it, and
 *      the reader must say `null` for all of them rather than draw an empty
 *      deck name;
 *   3. the reader hands a component a deck NAME and nothing else, even when a
 *      (broken) emitter puts a path on the AI's deck. `tools/check-redaction.mjs`
 *      fails such a log; this is the renderer's half of the same rule.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { initialState, reduce } from '../src/reduce.ts';
import { seatMatchOf, type Frame, type HelloOkBody } from '../src/protocol.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

function frame(overrides: Record<string, unknown>): Frame {
  return { v: 1, seq: 1, t: 1757600000000, type: 'notice', body: {}, ...overrides } as unknown as Frame;
}

const MATCH = {
  yourDeck: { name: 'Pacho SHIELD (Marvel Super Heroes)', path: 'decks/pacho-shield.dck', cards: 40 },
  aiDeck: { name: 'Morph probe', cards: 40 },
  aiProfile: 'Reckless',
  games: 1,
};

function hello(gameId: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gameId,
    you: 0,
    seed: 42,
    forgeVersion: '2.0.14',
    forgeJarSha256: 'abc',
    unsupportedCards: [],
    players: [
      { id: 0, name: 'Pacho', isAi: false },
      { id: 1, name: 'Forge AI', isAi: true },
    ],
    ...extra,
  };
}

test('seatMatchOf: your seat reads yourDeck, the AI seat reads aiDeck and the profile', () => {
  const state = reduce(initialState(), frame({ type: 'hello_ok', body: hello('g1', { match: MATCH }) }));
  assert.deepEqual(seatMatchOf(state.hello, 0), {
    deck: 'Pacho SHIELD (Marvel Super Heroes)',
    aiProfile: null,
  });
  assert.deepEqual(seatMatchOf(state.hello, 1), { deck: 'Morph probe', aiProfile: 'Reckless' });
  // A seat the handshake does not name has no plate.
  assert.equal(seatMatchOf(state.hello, 7), null);
});

test('seatMatchOf: a stream without `match` says nothing — it is optional (M44)', () => {
  const state = reduce(initialState(), frame({ type: 'hello_ok', body: hello('g1') }));
  assert.equal(seatMatchOf(state.hello, 0), null);
  assert.equal(seatMatchOf(state.hello, 1), null);
  assert.equal(seatMatchOf(null, 0), null);
  assert.equal(seatMatchOf(undefined, 0), null);
  const nulled = reduce(initialState(), frame({ type: 'hello_ok', body: hello('g1', { match: null }) }));
  assert.equal(seatMatchOf(nulled.hello, 1), null);
});

test('seatMatchOf: the profile belongs to a seat marked isAi, never to yours', () => {
  // A human-vs-human handshake (not something this bridge emits) must not
  // label the other human with an AI profile just because it is "not you".
  const body = hello('g1', {
    match: MATCH,
    players: [
      { id: 0, name: 'Pacho', isAi: false },
      { id: 1, name: 'Friend', isAi: false },
    ],
  });
  const state = reduce(initialState(), frame({ type: 'hello_ok', body }));
  assert.deepEqual(seatMatchOf(state.hello, 1), { deck: 'Morph probe', aiProfile: null });
});

test('seatMatchOf hands a component a NAME, even if an emitter put a path on the AI deck', () => {
  // check-redaction.mjs fails this log outright; the reader still must not
  // surface the extra keys, because a component spreads what it is given.
  const leaky = { ...MATCH, aiDeck: { name: 'Morph probe', cards: 40, path: 'decks/morph-probe.dck' } };
  const state = reduce(initialState(), frame({ type: 'hello_ok', body: hello('g1', { match: leaky }) }));
  const seat = seatMatchOf(state.hello, 1);
  assert.deepEqual(Object.keys(seat ?? {}).sort(), ['aiProfile', 'deck']);
  assert.equal(JSON.stringify(seat).includes('.dck'), false);
  // An empty or blank name is "the wire does not say", not a blank line.
  const blank = { ...MATCH, aiDeck: { name: '  ', cards: 40 } };
  const s2 = reduce(initialState(), frame({ type: 'hello_ok', body: hello('g1', { match: blank }) }));
  assert.deepEqual(seatMatchOf(s2.hello, 1), { deck: null, aiProfile: 'Reckless' });
});

test('a resync keeps the match, and a new game reads the new handshake', () => {
  let state = reduce(initialState(), frame({ type: 'hello_ok', body: hello('g1', { match: MATCH }) }));
  state = reduce(state, frame({ seq: 1, type: 'hello_ok', body: hello('g1', { match: MATCH }) }));
  assert.equal(seatMatchOf(state.hello, 1)?.aiProfile, 'Reckless');
  // Game 2 of the match (amendment M38): a new gameId, the same match.
  const g2 = { ...MATCH, games: 3 };
  state = reduce(state, frame({ seq: 2, type: 'hello_ok', body: hello('g1-g2', { match: g2 }) }));
  assert.equal(state.gameNumber, 2);
  assert.equal(seatMatchOf(state.hello, 1)?.deck, 'Morph probe');
  assert.equal((state.hello as HelloOkBody).match?.games, 3);
});

// ---------------------------------------------------------------------------
// The committed corpus
// ---------------------------------------------------------------------------

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

function hellos(path: string): HelloOkBody[] {
  const { frames } = parseFrameLog(readFileSync(path, 'utf8'));
  return frames.filter((f) => f.type === 'hello_ok').map((f) => f.body as HelloOkBody);
}

test('over the committed ENGINE corpus: no match means null on every seat, a match reads back', () => {
  // Every file here predated M44 when this test was written. A fixture
  // re-recorded afterwards carries the block, and that is fine: then its AI
  // seat must read back its own aiDeck name and profile, and nothing else.
  const files = readdirSync(`${FIXTURES}games/`).filter((f) => f.endsWith('.jsonl'));
  assert.ok(files.length >= 14, `expected the whole committed corpus, found ${String(files.length)}`);
  let seen = 0;
  let without = 0;
  for (const file of files) {
    for (const body of hellos(`${FIXTURES}games/${file}`)) {
      seen += 1;
      if (body.match === undefined || body.match === null) {
        without += 1;
        for (const p of body.players) assert.equal(seatMatchOf(body, p.id), null, file);
        continue;
      }
      for (const p of body.players) {
        const seat = seatMatchOf(body, p.id);
        assert.ok(seat !== null, file);
        assert.equal(seat.deck, p.id === body.you ? body.match.yourDeck.name : body.match.aiDeck.name);
        assert.equal(seat.aiProfile, p.id !== body.you && p.isAi ? body.match.aiProfile : null);
      }
    }
  }
  assert.ok(seen >= files.length, 'every recording has a hello_ok');
  console.log(`  hello_ok.match: absent from ${String(without)} of ${String(seen)} committed handshake(s)`);
});

test('the synthetic sample carries the match block, and it reads back per seat', () => {
  const [body] = hellos(`${FIXTURES}synthetic/sample-handwritten.jsonl`);
  assert.ok(body !== undefined, 'the sample has a hello_ok');
  assert.deepEqual(seatMatchOf(body, body.you), {
    deck: 'Pacho SHIELD (Marvel Super Heroes)',
    aiProfile: null,
  });
  const ai = body.players.find((p) => p.isAi);
  assert.ok(ai !== undefined);
  assert.deepEqual(seatMatchOf(body, ai.id), { deck: 'Morph probe', aiProfile: 'Reckless' });
  // `games` and M41's `gameCount` are the same `--games N`.
  assert.equal(body.match?.games, body.gameCount);
  // The AI's deck is a name and a count, nothing else (hard rule 8).
  assert.deepEqual(Object.keys(body.match?.aiDeck ?? {}).sort(), ['cards', 'name']);
});
