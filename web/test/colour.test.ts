/*
 * mtg-table — web/test/colour.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The one string the arena parses** (report 09 §7.3, §10.6).
 *
 * `Card` carries no `colors` field, so colour identity — the input to every
 * archetype lookup and to every glow tint — is read off `manaCost`. Eight cases
 * are named in §10.6 and all eight are here, plus the corpus sweep that matters
 * more than any of them: **every `manaCost` in every committed recording**
 * parses to a WUBRG-ordered identity, and the whole deck's costs are printed so
 * a change in the parser shows up as a diff rather than as a silently different
 * glow.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { COLOUR_LETTERS, colourHex, colourIdOf, isMulticolour } from '../src/arena/colour.ts';
import { isHidden, type AnyCard } from '../src/protocol.ts';
import { initialState, reduce } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

test('colour: report 09 §10.6, all eight named cases', () => {
  assert.equal(colourIdOf('{1}{W}'), 'W');
  assert.equal(colourIdOf('{U/B}'), 'UB');
  assert.equal(colourIdOf('{2/W}'), 'W');
  assert.equal(colourIdOf('{X}{G}{G}'), 'G');
  assert.equal(colourIdOf('{W}{U}'), 'WU');
  assert.equal(colourIdOf(''), 'C');
  assert.equal(colourIdOf('{C}'), 'C');
  assert.equal(colourIdOf('{W/P}'), 'W');
});

test('colour: null is a land or a token, and is colourless', () => {
  assert.equal(colourIdOf(null), 'C');
  assert.equal(colourIdOf(undefined), 'C');
});

test('colour: letters come back in WUBRG order whatever order the cost is in', () => {
  assert.equal(colourIdOf('{G}{W}'), 'WG');
  assert.equal(colourIdOf('{B}{U}{W}'), 'WUB');
  assert.equal(colourIdOf('{R}{G}{B}{U}{W}'), 'WUBRG');
  // Duplicates collapse; a cost is an identity, not a multiset.
  assert.equal(colourIdOf('{W}{W}{W}'), 'W');
});

test('colour: it never throws, whatever it is handed', () => {
  for (const junk of ['', '   ', '{}', 'no cost', '{S}', '{2}', '{∞}', 'WUBRG', '{w}{u}']) {
    const id = colourIdOf(junk);
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0);
  }
  // Lower case is Forge's when it is: the parser upper-cases first.
  assert.equal(colourIdOf('{w}{u}'), 'WU');
});

test('colour: multicolour and the palette', () => {
  assert.equal(isMulticolour('WU'), true);
  assert.equal(isMulticolour('W'), false);
  assert.equal(isMulticolour('C'), false);
  // Gold for multicolour, grey for colourless, one hex per letter otherwise.
  assert.equal(colourHex('WU'), colourHex('BR'));
  assert.notEqual(colourHex('W'), colourHex('U'));
  for (const letter of COLOUR_LETTERS) {
    assert.match(colourHex(letter), /^#[0-9a-f]{6}$/i);
  }
  assert.match(colourHex('C'), /^#[0-9a-f]{6}$/i);
  assert.match(colourHex('anything else'), /^#[0-9a-f]{6}$/i);
});

test('colour: every manaCost in every committed recording parses', () => {
  const costs = new Map<string, string>();
  let cards = 0;
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      for (const frame of log.frames) {
        state = reduce(state, frame);
        const board = state.board;
        if (board === null) continue;
        const every: AnyCard[] = [...board.stackCards];
        for (const player of board.players) {
          for (const zone of [
            player.zones.hand,
            player.zones.battlefield,
            player.zones.graveyard,
            player.zones.exile,
            player.zones.command,
          ]) {
            every.push(...zone.cards);
          }
          every.push(...player.zones.library.cards);
        }
        for (const card of every) {
          if (isHidden(card)) continue;
          cards += 1;
          const cost = (card as { manaCost: string | null }).manaCost;
          const id = colourIdOf(cost);
          costs.set(cost ?? '(null)', id);
          // The invariant: WUBRG order, or exactly "C".
          assert.match(id, /^(C|W?U?B?R?G?)$/, `${String(cost)} -> ${id}`);
          assert.notEqual(id, '');
        }
      }
    }
  }
  assert.ok(cards > 1000, `expected the corpus to carry cards, saw ${String(cards)}`);
  const table = [...costs.entries()].sort(([a], [b]) => a.localeCompare(b));
  console.log(`colour: ${String(table.length)} distinct mana costs over ${String(cards)} cards`);
  for (const [cost, id] of table) console.log(`  ${cost.padEnd(14)} -> ${id}`);
});
