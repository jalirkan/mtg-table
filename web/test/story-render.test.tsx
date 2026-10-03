/*
 * mtg-table — web/test/story-render.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Hard rule 8 on the `#story` page, over every fixture** (D127).
 *
 * The narrator's own gate (`tools/narrate-selftest.mjs`) holds the TEXT it
 * tells. This file holds the PAGE — everything the page puts in its markup: the
 * column of moments, the card names it marks (`data-card-id` /
 * `data-card-name`), the summary card, the frame on screen and its card images'
 * `alt` text. It renders `<Story/>` the way `render.test.tsx` renders the board —
 * `renderToStaticMarkup` over every committed fixture, at cursors spread through
 * each log, in both of the page's modes (what comes after the cursor dimmed, and
 * hidden) — and checks it against an ORACLE written apart from the narrator
 * (`hidden-oracle.ts`, which the arena's caption strip is held to as well):
 *
 *   1. BY IDS: an id concealed in EVERY appearance in the log (a five-key stub,
 *      or face-down with no `alt`) is never marked with a name;
 *   2. BY BACKING: every marked (id, name) pair is a name that id carries on a
 *      visible card somewhere in the log;
 *   3. BY NAMES: no card name in `decks/*.dck` that the log never shows as a
 *      visible card (nor as the seat's own sideboard label or an M44 deck name)
 *      appears anywhere in the markup, attributes included;
 *   4. HIDDEN MEANS HIDDEN: in `hide` mode no moment of a frame after the cursor
 *      is on the page; in `dim` mode every such moment is marked `ahead`;
 *   5. no `undefined`, `[object Object]` or `(123)` engine id reaches the page.
 *
 * **The negative control**, because a check that cannot fail proves nothing
 * (`check-redaction-selftest.mjs`'s rule): a copy of `disjoint.jsonl` whose
 * always-hidden card #79 carries a REAL deck card's name on its stub — one of
 * `decks/pacho-shield.dck`'s cards the log never shows, so check 3 finds it from
 * the decks alone, with nothing added to its forbidden list — with the `hidden`
 * flag dropped (a leaky emitter): the page prints it, and checks 1 and 3 must both
 * catch it; and the same name with `hidden: true` kept — the page must not print
 * it at all.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { EMPTY_ART_INDEX, parseArtFile, type ArtIndex } from '../src/art.ts';
import { replayFrames } from '../src/reduce.ts';
import Story, { type Ahead, type StoryFollow } from '../src/story/Story.tsx';
import { narrate } from '../src/story/narrate.ts';
import { parseFrameLog, type ParsedFrameLog } from '../src/transport/replay.ts';
import { audit, DECK_NAMES, markedCards, problemsOf, unescapeHtml } from './hidden-oracle.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));

function loadArt(): ArtIndex {
  try {
    return parseArtFile(JSON.parse(readFileSync(REPO + 'web/public/art.json', 'utf8')));
  } catch {
    return EMPTY_ART_INDEX;
  }
}
const art = loadArt();

const FIXTURES = [
  ...readdirSync(REPO + 'fixtures/games')
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => `fixtures/games/${f}`),
  ...readdirSync(REPO + 'fixtures/synthetic')
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => `fixtures/synthetic/${f}`),
];

// ---------------------------------------------------------------------------
// The page, rendered

const noop = (): void => undefined;

function renderPage(log: ParsedFrameLog, cursor: number, ahead: Ahead, follow: StoryFollow | null = null): string {
  return renderToStaticMarkup(
    <Story
      header={log.header}
      frames={log.frames}
      total={log.frames.length}
      cursor={cursor}
      state={replayFrames(log.frames, cursor, log.header)}
      playing={false}
      follow={follow}
      art={art}
      initialAhead={ahead}
      onScrub={noop}
      onToggle={noop}
      onStep={noop}
      onSetView={noop}
    />,
  );
}

const logs = new Map<string, ParsedFrameLog>();
const logOf = (file: string): ParsedFrameLog => {
  const hit = logs.get(file);
  if (hit !== undefined) return hit;
  const log = parseFrameLog(readFileSync(REPO + file, 'utf8'));
  logs.set(file, log);
  return log;
};

let rendered = 0;
let marked = 0;

for (const file of FIXTURES) {
  test(`${file}: the story page names only what its log shows, at every cursor we try, dimmed and hidden`, () => {
    const log = logOf(file);
    const oracle = audit(log);
    const n = log.frames.length;
    const cursors = [...new Set([0, 1, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1, n])];
    const full = narrate({ header: log.header, frames: log.frames });
    const factCount = full.games.reduce((k, g) => k + g.facts.length, 0);
    for (const cursor of cursors) {
      for (const ahead of ['dim', 'hide'] as const) {
        const label = `${file} @${String(cursor)} ${ahead}`;
        let html: string;
        try {
          html = renderPage(log, cursor, ahead);
        } catch (cause) {
          expect.fail(`${label}: <Story/> threw: ${String(cause)}`);
        }
        rendered += 1;
        expect(problemsOf(label, html, oracle), label).toEqual([]);
        marked += markedCards(html).length;
        // 4. hidden means hidden; dimmed means marked.
        const moments = [...html.matchAll(/<li class="story__moment story__moment--(\w+)" data-frame="(\d+)"/g)].map((m) => ({
          placement: m[1],
          frame: Number(m[2]),
        }));
        if (ahead === 'hide') {
          const late = moments.filter((m) => m.frame >= cursor);
          expect(late, `${label}: moments after the cursor are on the page`).toEqual([]);
        } else {
          expect(moments.length, `${label}: the dimmed page draws every fact`).toBe(factCount);
          for (const m of moments) {
            expect(m.placement === 'ahead', `${label}: frame ${String(m.frame)} is ${String(m.placement)}`).toBe(m.frame >= cursor);
          }
        }
      }
    }
  });
}

test('the corpus sweep rendered the page and marked names', () => {
  // Printed so a sweep that silently rendered nothing is visible.
  console.log(`story-render: ${String(rendered)} renderings of ${String(FIXTURES.length)} logs, ${String(marked)} marked card names checked`);
  expect(rendered).toBeGreaterThanOrEqual(FIXTURES.length * 10);
  expect(marked).toBeGreaterThan(1000);
});

test('follow mode: the tail says so, and a log still being recorded is not a finished one', () => {
  const log = logOf('fixtures/games/g1.jsonl');
  const half = Math.floor(log.frames.length / 2);
  const cut: ParsedFrameLog = { header: log.header, frames: log.frames.slice(0, half), warnings: [] };
  const html = renderPage(cut, half, 'hide', 'following');
  expect(html).toContain('● following — the story grows as the recorder writes it');
  expect(html).toContain('The game is still being recorded.');
  expect(html).not.toContain('Game over');
  expect(renderPage(log, log.frames.length, 'dim', 'finished')).toContain('recording finished — this is a replay now');
  // A 416 (polish-1): the followed file was re-recorded, following stopped, and
  // the page says so -- no live word, and not "still being recorded".
  const lost = renderPage(cut, half, 'hide', 'lost');
  expect(lost).toContain('data-tail="lost"');
  expect(unescapeHtml(lost)).toContain('recording lost — the file was re-recorded under the same name');
  expect(lost).not.toContain('●');
  expect(lost).not.toContain('The game is still being recorded.');
});

// ---------------------------------------------------------------------------
// The negative control

// A card of the deck in play (`decks/pacho-shield.dck`) that `disjoint.jsonl`
// never shows face up: the leak a real emitter would make is a real card's
// name, and check 3 has to find it in `decks/*.dck` on its own.
const LEAKED = 'Borough Backup';

test('negative control: a real deck name on an always-hidden stub is caught by ids and by names; with the flag kept it is never printed', () => {
  const file = 'fixtures/games/disjoint.jsonl';
  const clean = logOf(file);
  const oracle = audit(clean);
  expect(DECK_NAMES.has(LEAKED), `${LEAKED} is not a card in decks/*.dck`).toBe(true);
  expect(oracle.visibleNames.has(LEAKED), `${file} shows ${LEAKED}, so it cannot stand for an unseen card`).toBe(false);
  // The opponent's draw of a card concealed in every frame: the story's line
  // for it is "Draws a card." — the id is on the page's facts, nameless.
  const story = narrate({ header: clean.header, frames: clean.frames });
  const draw = story.games[0]!.facts.find((f) => f.kind === 'draw' && f.cards.some((c) => oracle.alwaysHidden.has(c.id)));
  expect(draw, 'disjoint.jsonl has no narrated draw of an always-hidden card to inject into').toBeDefined();
  const id = draw!.cards.find((c) => oracle.alwaysHidden.has(c.id))!.id;

  const doctor = (keepHidden: boolean): ParsedFrameLog => {
    const copy = structuredClone(clean);
    let hits = 0;
    for (const f of copy.frames) {
      if (f.type !== 'state' || f.seq !== draw!.seq) continue;
      for (const p of f.body.players) {
        p.zones.hand.cards = p.zones.hand.cards.map((c) => {
          if (c.id !== id) return c;
          hits += 1;
          const leaked = { ...c, name: LEAKED } as Record<string, unknown>;
          if (!keepHidden) delete leaked['hidden'];
          return leaked as unknown as typeof c;
        });
      }
    }
    expect(hits, `expected to doctor exactly one stub of #${String(id)}`).toBe(1);
    return copy;
  };

  // A leaky emitter: the page prints what the log says, and both checks catch it
  // — check 3 from the decks alone, with no extra forbidden name handed to it.
  const leaky = doctor(false);
  const html = renderPage(leaky, draw!.frameIndex + 1, 'dim');
  expect(unescapeHtml(html), 'the injected name did not reach the page, so the control proves nothing').toContain(LEAKED);
  const problems = problemsOf('N1', html, oracle);
  expect(problems.some((p) => p.includes(`card #${String(id)} is concealed in every frame`)), 'check 1 (by ids) missed it').toBe(true);
  expect(problems.some((p) => p.includes(JSON.stringify(LEAKED)) && p.includes('a name the log never shows')), 'check 3 (by names) missed it').toBe(true);

  // The flag kept: the narrator's one face reader reads nothing off a stub, so
  // neither does the page.
  const held = doctor(true);
  const heldHtml = renderPage(held, draw!.frameIndex + 1, 'dim');
  expect(unescapeHtml(heldHtml)).not.toContain(LEAKED);
  expect(problemsOf('N2', heldHtml, oracle)).toEqual([]);
});
