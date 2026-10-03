/*
 * mtg-table — web/test/arena-caption.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Hard rule 8 on the arena's caption strip, over every frame of every fixture**
 * (D255). `caption.test.ts` holds which moments the strip is handed; this file
 * holds what the strip PUTS ON SCREEN. It renders `<CaptionStrip/>` with
 * `renderToStaticMarkup` for the caption at EVERY cursor of every committed log —
 * the replay's, and the live seat's (the frames `liveLog.ts` records off the
 * socket, captioned at each `state` as it arrives) — and checks the markup against
 * `hidden-oracle.ts`, the oracle `story-render.test.tsx` holds the `#story` page to,
 * written apart from the narrator:
 *
 *   1. BY IDS: an id concealed in every appearance in the log is never marked
 *      with a name (`data-card-id` / `data-card-name`);
 *   2. BY BACKING: every marked (id, name) pair is a name that id carries on a
 *      visible card in the log;
 *   3. BY NAMES: no `decks/*.dck` card name the log never shows is anywhere in
 *      the markup — the tooltips (`title`) included;
 *   4. NO FUTURE: every line on the strip is of a frame the cursor has applied;
 *   5. hygiene: no `undefined`, `[object Object]` or `(123)` engine id.
 *
 * **The negative control**: `disjoint.jsonl`'s card #79 — the opponent's, concealed
 * in every frame — given a real deck card's name on its stub with the `hidden`
 * flag dropped (a leaky emitter): the strip prints it at the opponent's draw of
 * it, and checks 1 and 3 both catch it (3 from the decks alone). With the flag
 * kept, the name is nowhere on the strip: the narrator's one face reader reads
 * nothing off a stub, so neither does the caption.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import type { ArenaCaption } from '../src/arena/caption.ts';
import { CaptionStrip } from '../src/arena/CaptionStrip.tsx';
import { LiveFrameLog } from '../src/liveLog.ts';
import { captionAt, captionIndexOf } from '../src/story/caption.ts';
import { narrate } from '../src/story/narrate.ts';
import { parseFrameLog, type ParsedFrameLog } from '../src/transport/replay.ts';
import { audit, DECK_NAMES, markedCards, problemsOf, unescapeHtml } from './hidden-oracle.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));

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

const logs = new Map<string, ParsedFrameLog>();
const logOf = (file: string): ParsedFrameLog => {
  const hit = logs.get(file);
  if (hit !== undefined) return hit;
  const log = parseFrameLog(readFileSync(REPO + file, 'utf8'));
  logs.set(file, log);
  return log;
};

const render = (caption: ArenaCaption | null): string => renderToStaticMarkup(<CaptionStrip caption={caption} />);

/** Check 4: every line is of a frame the cursor has applied. */
function futureOf(label: string, caption: ArenaCaption | null, cursor: number): string[] {
  if (caption === null) return [];
  return [...caption.before, ...caption.now]
    .filter((line) => line.frameIndex >= cursor)
    .map((line) => `${label}: a line of frame ${String(line.frameIndex)} is on the strip at cursor ${String(cursor)}`);
}

let rendered = 0;
let shown = 0;
let marked = 0;
let liveRendered = 0;

for (const file of FIXTURES) {
  test(`${file}: the caption strip names only what its log shows, at every cursor, replayed and live`, () => {
    const log = logOf(file);
    const oracle = audit(log);
    const index = captionIndexOf(log.header, log.frames);
    for (let cursor = 0; cursor <= log.frames.length; cursor++) {
      const caption = captionAt(index, cursor);
      const html = render(caption);
      const label = `${file} @${String(cursor)}`;
      rendered += 1;
      if (caption === null) {
        expect(html, `${label}: no caption, and the strip drew something`).toBe('');
        continue;
      }
      shown += 1;
      marked += markedCards(html).length;
      expect([...problemsOf(label, html, oracle), ...futureOf(label, caption, cursor)], label).toEqual([]);
      expect(html).toContain('class="arena__caption arena__caption--');
      expect(html).toContain(`data-frame="${String(caption.frame)}"`);
    }
    // Live: the frames recorded off the socket, captioned at each snapshot as it arrives.
    const live = new LiveFrameLog();
    for (const frame of log.frames) {
      live.push(frame);
      if (frame.dir === 'c2s' || frame.type !== 'state') continue;
      const caption = captionAt(captionIndexOf(live.header, live.frames), live.frames.length);
      const html = render(caption);
      const label = `${file} live @${String(live.frames.length)}`;
      liveRendered += 1;
      expect([...problemsOf(label, html, oracle), ...futureOf(label, caption, live.frames.length)], label).toEqual([]);
    }
  });
}

test('the corpus sweep rendered the strip and marked names', () => {
  // Printed so a sweep that silently rendered nothing is visible.
  console.log(
    `arena-caption: ${String(rendered)} cursors of ${String(FIXTURES.length)} logs rendered (${String(shown)} with a caption, ` +
      `${String(marked)} marked card names checked), and ${String(liveRendered)} live snapshots`,
  );
  expect(shown).toBeGreaterThan(5000);
  expect(marked).toBeGreaterThan(2000);
  expect(liveRendered).toBeGreaterThan(3000);
});

test('the strip: a turn marker, the earlier lines dimmed above, the frame’s lines, and nothing else', () => {
  const log = logOf('fixtures/games/g1.jsonl');
  const caption = captionAt(captionIndexOf(log.header, log.frames), 208);
  expect(caption).not.toBeNull();
  const html = render(caption);
  const turn = html.indexOf('arena__caption-turn');
  const before = html.indexOf('arena__caption-line--before');
  const now = html.indexOf('arena__caption-line--now');
  expect(turn).toBeGreaterThan(0);
  expect(before).toBeGreaterThan(turn);
  expect(now).toBeGreaterThan(before);
  expect(html).toContain('arena__caption--opp');
  expect(html).toContain('role="status"');
  expect(html).toContain('>Turn 14 · AI-Seat1 (AI)<');
  // One turn, one marker: the two earlier lines are the same turn's.
  expect((html.match(/arena__caption-turn /g) ?? []).length).toBe(1);
  expect(unescapeHtml(html)).toContain('data-card-name="Aerial Doombot"');
  // Only the pieces of the three lines and the marker: no image, no link, no button.
  expect(html).not.toMatch(/<(img|a|button|input)\b/);
  expect((html.match(/<p /g) ?? []).length).toBe(3);
  // The whole sentence is each line's tooltip.
  expect(unescapeHtml(html)).toContain('title="Casts Aerial Doombot ({U}, artifact creature 1/1)."');
  expect(render(null)).toBe('');
});

test('a line from another turn sits under its own turn’s marker', () => {
  // The live seat's first caption of its third turn: the opponent's two lines of
  // turn 2 above it, dimmed, under turn 2's marker — never under "Human (you)".
  const line = (text: string, turn: string, side: 'you' | 'opp'): ArenaCaption['now'][number] => ({
    text,
    pieces: [{ text, card: null }],
    frameIndex: 1,
    turn,
    side,
  });
  const html = render({
    frame: 9,
    turn: 'Turn 3 · Human (you)',
    side: 'you',
    before: [line('Plays Plains.', 'Turn 2 · Forge AI (AI)', 'opp'), line('Casts S.H.I.E.L.D. Spy Kit.', 'Turn 2 · Forge AI (AI)', 'opp')],
    now: [line('Draws a card.', 'Turn 3 · Human (you)', 'you')],
    more: 0,
  });
  const order = [...html.matchAll(/arena__caption-turn arena__caption-turn--(\w+) arena__caption-turn--(\w+)">([^<]*)<|title="([^"]*)"/g)].map((m) =>
    m[3] !== undefined ? `marker ${m[1]!}/${m[2]!}: ${m[3]}` : `line: ${m[4]!}`,
  );
  expect(order).toEqual([
    'marker opp/before: Turn 2 · Forge AI (AI)',
    'line: Plays Plains.',
    'line: Casts S.H.I.E.L.D. Spy Kit.',
    'marker you/now: Turn 3 · Human (you)',
    'line: Draws a card.',
  ]);
});

// ---------------------------------------------------------------------------
// The negative control

const LEAKED = 'Borough Backup';

test('negative control: a real deck name on an always-hidden stub reaches the strip and is caught by ids and by names; with the flag kept it is never printed', () => {
  const file = 'fixtures/games/disjoint.jsonl';
  const clean = logOf(file);
  const oracle = audit(clean);
  expect(DECK_NAMES.has(LEAKED), `${LEAKED} is not a card in decks/*.dck`).toBe(true);
  expect(oracle.visibleNames.has(LEAKED), `${file} shows ${LEAKED}, so it cannot stand for an unseen card`).toBe(false);
  const story = narrate({ header: clean.header, frames: clean.frames });
  const draw = story.games[0]!.facts.find((f) => f.kind === 'draw' && f.cards.some((c) => oracle.alwaysHidden.has(c.id)));
  expect(draw, 'disjoint.jsonl has no narrated draw of an always-hidden card to inject into').toBeDefined();
  const id = draw!.cards.find((c) => oracle.alwaysHidden.has(c.id))!.id;
  const cursor = draw!.frameIndex + 1;

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

  // The clean log: the strip at the draw says "a card" and names nothing hidden.
  const cleanHtml = render(captionAt(captionIndexOf(clean.header, clean.frames), cursor));
  expect(unescapeHtml(cleanHtml), 'the draw is not on the strip at its own frame').toContain(draw!.text);
  expect(problemsOf('clean', cleanHtml, oracle)).toEqual([]);

  // A leaky emitter: the strip prints what the log says, and both checks catch it.
  const leaky = doctor(false);
  const html = render(captionAt(captionIndexOf(leaky.header, leaky.frames), cursor));
  expect(unescapeHtml(html), 'the injected name did not reach the strip, so the control proves nothing').toContain(LEAKED);
  const problems = problemsOf('N1', html, oracle);
  expect(problems.some((p) => p.includes(`card #${String(id)} is concealed in every frame`)), 'check 1 (by ids) missed it').toBe(true);
  expect(problems.some((p) => p.includes(JSON.stringify(LEAKED)) && p.includes('a name the log never shows')), 'check 3 (by names) missed it').toBe(true);

  // The flag kept: nothing is read off a stub, so the strip never says it.
  const held = doctor(true);
  const heldHtml = render(captionAt(captionIndexOf(held.header, held.frames), cursor));
  expect(unescapeHtml(heldHtml)).not.toContain(LEAKED);
  expect(problemsOf('N2', heldHtml, oracle)).toEqual([]);
});
