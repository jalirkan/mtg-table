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

test('arena HUD: each plate names its deck and the AI plate its profile, from hello_ok.match (M44)', () => {
  // Match setup. The synthetic sample is the corpus's stream that carries
  // `hello_ok.match`; the plates read it through `seatMatchOf`, the board rail's
  // own reader, so the AI's deck arrives as a NAME and your deck's path (which
  // the handshake does carry, for your seat only) is never printed.
  const state = statesOf('synthetic/sample-handwritten.jsonl').at(-1);
  expect(state).toBeDefined();
  const html = markup(state!);
  const shown = text(html);
  expect(shown).toContain('Pacho SHIELD (Marvel Super Heroes)');
  expect(shown).toContain('Morph probe');
  expect(shown).toContain('AI (Reckless)');
  expect(html.match(/class="arena__seat-deck"/g)?.length).toBe(2);
  expect(html).not.toContain('.dck');

  // A recording made before M44 has no `match`, and a plate then draws no line
  // at all rather than an empty one.
  for (const s of statesOf('games/g1.jsonl')) {
    expect(markup(s)).not.toContain('arena__seat-deck');
  }
});

/**
 * The direct children of every `.arena__seat` in some static markup, as their
 * class attributes. A tag walk, not a DOM: vitest runs these files in the `node`
 * environment, as `render.test.tsx` does.
 */
function plateRows(html: string): string[][] {
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const plates: string[][] = [];
  const open: { depth: number; rows: string[] }[] = [];
  let depth = 0;
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = m;
    if (closing === '/') {
      depth -= 1;
      if (open.length > 0 && open[open.length - 1]!.depth === depth) plates.push(open.pop()!.rows);
      continue;
    }
    const cls = /\bclass="([^"]*)"/.exec(attrs ?? '')?.[1] ?? '';
    const top = open[open.length - 1];
    if (top !== undefined && depth === top.depth + 1) top.rows.push(cls);
    if (selfClosing === '/' || VOID.has(tag!.toLowerCase())) continue;
    if (cls.split(/\s+/).includes('arena__seat')) open.push({ depth, rows: [] });
    depth += 1;
  }
  return plates;
}

test('arena HUD: a plate is four one-line rows whatever the frame says — a long --ai-name is cut, not wrapped (hardening, rebased onto match setup)', () => {
  // The plate is a keep-out over the opponent's duelist (`camera.ts`'s
  // PLAYER_PLATES), and `camera.test.ts` asserts it ends inside the top band
  // because every row is one line by the stylesheet. This is the markup half:
  // no frame adds a row. The worst frame this file can build — match setup's
  // deck and profile, a name far wider than the plate, player counters and
  // poison, and the AI both active and holding priority — is still four rows,
  // with the deck, the profile and the counters on the life row.
  const base = statesOf('synthetic/sample-handwritten.jsonl').at(-1);
  expect(base).toBeDefined();
  const state = structuredClone(base!);
  const board = state.board!;
  const ai = board.players.find((p) => p.isAi);
  expect(ai).toBeDefined();
  const longName = 'Doctor Doom, Monarch of Latveria, and every Doombot of the Legion besides';
  ai!.name = longName;
  ai!.poison = 3;
  ai!.counters = { ENERGY: 4, EXPERIENCE: 2 };
  board.activePlayer = ai!.id;
  board.priority = ai!.id;

  const html = markup(state);
  const plates = plateRows(html);
  expect(plates.length).toBe(2);
  for (const rows of plates) {
    expect(rows).toEqual(['arena__seat-who', 'arena__seat-vitals', 'arena__seat-zones', 'pool']);
  }
  // The whole name is still there — in the tooltip, and in the text the
  // ellipsis clips.
  expect(html).toContain(`class="arena__seat-name" title="${longName}"`);
  // The deck, the profile and the counters are inside the life row.
  const vitals = html.split('class="arena__seat-vitals"').slice(1);
  expect(vitals.length).toBe(2);
  const oppVitals = vitals.find((v) => v.includes('arena__seat-counters'));
  expect(oppVitals).toBeDefined();
  const oppRow = oppVitals!.slice(0, oppVitals!.indexOf('class="arena__seat-zones"'));
  expect(oppRow).toContain('class="arena__seat-deck"');
  expect(oppRow).toContain('class="arena__seat-profile"');
  expect(oppRow).toContain('class="arena__seat-counters"');
  expect(text(oppRow)).toContain('AI (Reckless)');
  // The profile is not in the name row's tags any more: there it wrapped the
  // row on the AI's own turn.
  expect(html).not.toMatch(/class="arena__seat-tags">[^<]*<span[^>]*>\s*\(/);
});

test('arena HUD: a spectated game says what is being watched — both decks, both profiles, "following" (M47)', () => {
  // A spectated recording is g1's shape (two AI seats) plus the match block
  // RecordMatch --match writes: M44's keys and the viewer's own profile.
  const log = parseFrameLog(readFileSync(FIXTURES + 'games/g1.jsonl', 'utf8'));
  const frames = log.frames.map((f) => {
    if (f.type !== 'hello_ok') return f;
    const body = {
      ...f.body,
      match: {
        yourDeck: { name: 'Pacho SHIELD (Marvel Super Heroes)', path: 'decks/pacho-shield.dck', cards: 40 },
        aiDeck: { name: 'Doom Legion (Marvel Super Heroes villains)', cards: 40 },
        aiProfile: 'Reckless',
        games: 1,
        yourProfile: 'Default',
      },
    };
    return { ...f, body };
  });
  let state = initialState(log.header);
  for (const frame of frames.slice(0, 120)) state = reduce(state, frame);

  const following = renderToStaticMarkup(<DecisionLayer state={state} onAct={null} follow="following" />);
  const shown = text(following);
  expect(following).toContain('class="arena__watch"');
  expect(shown).toContain('watching');
  expect(shown).toContain('Pacho SHIELD (Marvel Super Heroes) (Default) · seen from here');
  expect(shown).toContain('vs Doom Legion (Marvel Super Heroes villains) (Reckless)');
  expect(shown).toContain('● following');
  expect(following).not.toContain('.dck');
  // No engine prompt stands in for it: an AI-vs-AI stream never asks this seat,
  // and nobody at that table can concede.
  expect(shown).not.toContain('the engine has not asked');
  expect(following).not.toContain('data-act="concede"');

  expect(text(renderToStaticMarkup(<DecisionLayer state={state} onAct={null} follow="finished" />))).toContain(
    'recording finished',
  );
  // An ordinary replay of an AI-vs-AI log (no follow) still says who is playing,
  // by seat name when the recording carries no match block.
  const bare = statesOf('games/g1.jsonl')[5]!;
  const bareText = text(markup(bare));
  expect(bareText).toContain('watching AI-Seat0 · seen from here vs AI-Seat1');
  expect(bareText).not.toContain('following');
  // A human seat's recording is not a spectated game: the strip is the engine's.
  for (const s of statesOf('games/human-auto-42.jsonl').slice(0, 40)) {
    const html = markup(s);
    expect(html).not.toContain('arena__watch');
    expect(html).toContain('data-act="concede"');
  }
});
