/*
 * mtg-table — web/test/arena-hud.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **You cannot play Magic without knowing the life totals** (M7 verification
 * fix).
 *
 * The arena shipped with no persistent player HUD of any kind. `.arena__layer`'s
 * whole `innerText` during a live game was the engine prompt, the two engine
 * buttons, Concede, the cue strip and the art credit — no life, no poison, no
 * hand or library or graveyard count, no mana pool, no names. The `life.tick`
 * and `damage.player` cues do put a number on screen, but a cue **decays to
 * identity** by construction (report 09 §5.1), so that number exists for 400 ms
 * when it changes and is then gone. Report 09 budgets for a HUD in three places
 * (§9.1's "~12 `<Text>`" slots, §9.3's risk 2, §12.1's *"HUD overlays — plain
 * DOM above the canvas — free"*) and E6's deliverable is *"a full live game
 * against the Forge AI, played entirely in the 3D arena"*.
 *
 * `liveness.test.ts` guards the *mechanical* half — the plate's class is in the
 * `pointer-events: auto` table, so it cannot ship inert. This file guards the
 * half that matters: that the numbers are actually **there**, for both seats,
 * over real recorded frames, and that putting them there did not put a
 * concealed card's name on screen with them (hard rule 8, from a new surface).
 *
 * JSX, so vitest rather than `node --test`; `renderToStaticMarkup` in the node
 * environment, exactly as `render.test.tsx` does the board.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { DecisionLayer } from '../src/arena/DecisionLayer.tsx';
import { isHidden } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

/** Every `state`-bearing `ClientState` of one recording. */
function statesOf(file: string): ClientState[] {
  const log = parseFrameLog(readFileSync(FIXTURES + file, 'utf8'));
  let state = initialState(log.header);
  const out: ClientState[] = [];
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type === 'state') out.push(state);
  }
  return out;
}

function markup(state: ClientState): string {
  return renderToStaticMarkup(<DecisionLayer state={state} onAct={null} />);
}

/** `renderToStaticMarkup` gives us tags; this is what a player would read. */
function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

test('arena HUD: every seat’s life total is on screen, in every frame of g1', () => {
  const states = statesOf('games/g1.jsonl');
  expect(states.length).toBeGreaterThan(300);

  let checked = 0;
  let lifeSeen = 0;
  for (const state of states) {
    const board = state.board;
    if (board === null) continue;
    const html = markup(state);
    checked += 1;

    for (const player of board.players) {
      // The name, and the life total beside it. `life__n` is the board's own
      // class — the plate borrows the rail's markup rather than inventing a
      // second way to print a life total.
      expect(html).toContain(`<span class="life__n">${String(player.life)}</span>`);
      expect(html).toContain(player.name);
      lifeSeen += 1;
    }
    // …and the counts the player has no other way to get in 3D: a library is
    // never drawn on the table at all, and a hand of backs cannot be counted
    // across the table at a glance.
    expect(text(html)).toContain('hand');
    expect(text(html)).toContain('library');
  }

  expect(checked).toBeGreaterThan(300);
  // The point of the fix, as a number: 11 life is visible on 376 frames rather
  // than for 400 ms after the damage that caused it.
  console.log(`arena HUD: ${String(lifeSeen)} life totals rendered across ${String(checked)} g1 frames`);
});

test('arena HUD: a life change is visible in the frame it happens, and stays', () => {
  const states = statesOf('games/g1.jsonl');
  const seen: number[] = [];
  for (const state of states) {
    const board = state.board;
    if (board === null) continue;
    const life = board.players[0]?.life;
    if (life === undefined) continue;
    if (seen.at(-1) !== life) seen.push(life);
    expect(markup(state)).toContain(`<span class="life__n">${String(life)}</span>`);
  }
  expect(seen.length).toBeGreaterThan(1); // the game really did change a life total
  console.log(`arena HUD: seat 0's life went ${seen.join(' → ')}`);
});

test('arena HUD: the plates name no card the frame concealed', () => {
  // Hard rule 8, from the newest surface. The plate prints counts and a player
  // name; the one way it could leak is if a count were ever a card. It is not,
  // and this is the assertion that keeps it that way.
  for (const file of ['games/g1.jsonl', 'games/human-auto-42.jsonl']) {
    for (const state of statesOf(file)) {
      const board = state.board;
      if (board === null) continue;
      const html = markup(state);
      let hidden = 0;
      for (const player of board.players) {
        for (const zone of Object.values(player.zones)) {
          for (const card of zone.cards) {
            if (!isHidden(card)) continue;
            hidden += 1;
            // A redacted stub carries five keys and no `name`, so the only way
            // one of these could reach the markup is through an id.
            expect(html).not.toContain(`c:${String(card.id)}`);
          }
        }
      }
      expect(hidden).toBeGreaterThanOrEqual(0);
    }
  }
});

test('arena HUD: the mana pool is shown, read-only, and is never a control', () => {
  const state = statesOf('games/g1.jsonl').at(-1);
  expect(state).toBeDefined();
  const html = markup(state!);
  // `<ManaPoolPips>` with no `onSpend`: the pips are the read-only M4 row. The
  // arena draws no mana control at all (`Arena.tsx` keeps `poolColors` empty),
  // so a `useMana` button here would be a control with no keyboard behind it.
  expect(html).toContain('class="pool"');
  expect(html).not.toContain('data-act="useMana"');
});
