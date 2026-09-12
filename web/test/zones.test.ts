/*
 * mtg-table — web/test/zones.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M5's zone browsers, as a rule rather than as a panel.**
 *
 * The panel is thirty lines of JSX (`ZoneBrowser.tsx`); the thing that can be
 * wrong is *which zone it will open for whom*, and that is pure. What is
 * asserted, over every committed recording:
 *
 *   1. **another seat's hand is never browsable** (report 10 §3.2 — "the
 *      opponent's hand is a count in their rail and is never drawn as tiles").
 *      `panelCards` answers `[]` for it, so the component cannot express it
 *      even if a caller asks;
 *   2. a **library** panel is the revealed slice and never `count` stubs
 *      (§3.4 / amendment P2): `cards.length <= count` on the wire, and the
 *      panel shows exactly `cards`;
 *   3. `input.openZones` — a **hint**, never a question (§4.3) — turns into
 *      panels for seats that exist, filtered by rule 1, with no duplicates.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { isHidden } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import {
  BROWSABLE_ZONES,
  hintedPanels,
  mayBrowse,
  panelCards,
  panelCount,
  panelKey,
  panelTitle,
  samePanels,
} from '../src/render/zones.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

function states(): Array<{ file: string; state: ClientState }> {
  const out: Array<{ file: string; state: ClientState }> = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      for (const frame of log.frames) {
        state = reduce(state, frame);
        out.push({ file: dir + name, state });
      }
    }
  }
  return out;
}

function seatOf(state: ClientState): number | null {
  return state.hello?.you ?? state.session?.seat ?? null;
}

test('a hand is browsable at your own seat and nowhere else', () => {
  assert.equal(mayBrowse('hand', 0, 0), true);
  assert.equal(mayBrowse('hand', 1, 0), false);
  assert.equal(mayBrowse('hand', 0, null), false, 'a replay has no seat, so no hand panel');
  for (const zone of ['graveyard', 'exile', 'command', 'library']) {
    assert.equal(mayBrowse(zone, 1, 0), true, `${zone} is public or already redacted on the wire`);
  }
  // The battlefield and the stack are the table itself; there is nothing to open.
  assert.equal(mayBrowse('battlefield', 0, 0), false);
  assert.equal(mayBrowse('stack', 0, 0), false);
  assert.equal(mayBrowse('nonsense', 0, 0), false);
  assert.equal(BROWSABLE_ZONES.length, 5);
});

test('no panel over the whole corpus can show another seat’s hand', () => {
  let opponentHandsTried = 0;
  let cardsShown = 0;
  for (const { file, state } of states()) {
    const board = state.board;
    if (board === null) continue;
    const you = seatOf(state);
    for (const player of board.players) {
      for (const zone of BROWSABLE_ZONES) {
        const ref = { playerId: player.id, zone };
        const cards = panelCards(board, ref, you);
        cardsShown += cards.length;
        if (zone === 'hand' && (you === null || player.id !== you)) {
          opponentHandsTried += 1;
          assert.deepEqual(cards, [], `${file}: ${panelTitle(board, ref)} must show nothing`);
          continue;
        }
        // Whatever a panel does show is exactly what the wire carried for that
        // zone — no synthesised stubs, no cards from anywhere else.
        const wire = player.zones[zone].cards;
        assert.equal(cards.length, wire.length, `${file}: ${panelTitle(board, ref)}`);
        for (const card of cards) {
          assert.ok(wire.some((c) => c.id === card.id));
          // A concealed card in a browsable zone stays concealed; the panel
          // draws `CardTile`, which gives it a card back and no name.
          if (isHidden(card)) assert.ok(!('name' in card));
        }
        // §3.4 / P2 — `count` is authoritative and `cards` may be short of it.
        assert.ok(cards.length <= panelCount(board, ref));
      }
    }
  }
  assert.ok(opponentHandsTried > 0, 'no opponent hand in the corpus — the rule is vacuous');
  assert.ok(cardsShown > 0, 'no zone in the corpus has a card — the panels prove nothing');
});

test('openZones becomes panels: existing seats, no hands, no duplicates (§4.3)', () => {
  let withHints = 0;
  for (const { file, state } of states()) {
    const panels = hintedPanels(state.input, state.board, seatOf(state));
    if (state.input === null || state.input.openZones.length === 0) {
      assert.deepEqual(panels, [], `${file}: a panel with no hint`);
      continue;
    }
    withHints += 1;
    const keys = panels.map(panelKey);
    assert.equal(new Set(keys).size, keys.length, 'a duplicated panel');
    for (const ref of panels) {
      assert.ok(state.board?.players.some((p) => p.id === ref.playerId));
      assert.ok(mayBrowse(ref.zone, ref.playerId, seatOf(state)));
    }
  }
  // `fixtures/synthetic/sample-handwritten.jsonl` carries the one openZones in
  // the corpus: the engine asking for the opponent's graveyard and exile.
  assert.ok(withHints > 0, 'no input in the corpus carries openZones');
});

test('a hint that names an unknown seat or a hand yields nothing', () => {
  const board = {
    players: [{ id: 0 }, { id: 1 }],
  } as unknown as Parameters<typeof hintedPanels>[1];
  const input = {
    openZones: [
      { playerId: 9, zones: ['graveyard'] },
      { playerId: 1, zones: ['hand', 'Graveyard', 'graveyard'] },
    ],
  } as unknown as Parameters<typeof hintedPanels>[0];
  const panels = hintedPanels(input, board, 0);
  // Forge's zone names arrive capitalised in places; the filter lowercases, and
  // the duplicate that produces is dropped.
  assert.deepEqual(panels, [{ playerId: 1, zone: 'graveyard' }]);
  assert.ok(samePanels(panels, [{ playerId: 1, zone: 'graveyard' }]));
  assert.ok(!samePanels(panels, []));
});
