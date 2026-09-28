/*
 * mtg-table — web/test/story.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The story page's pure half, and the narrator's one implementation** (D124,
 * D125, D126). What `node --test` can hold without JSX:
 *
 *   - `web/src/story/narrate.ts` IS the CLI's narrator: the golden files under
 *     `fixtures/narrate/` come out of it byte for byte, and `tools/narrate.mjs`
 *     defines no narration of its own (it imports this module);
 *   - every fact knows its frame (`frameIndex`), in order, and the outline the
 *     page draws holds every fact exactly once;
 *   - the frames the replay transport parses tell the same story as the frames
 *     the CLI parses, over the whole corpus — so the page and the terminal agree;
 *   - a prefix of a log tells the prefix of its story (what `#story` does while
 *     it hides what comes after the cursor);
 *   - the cursor's landmarks (`page.ts`), the sentence cutter, the keymap;
 *   - and the page's boundaries, by source scan: lazy, no transport, no fetch,
 *     no timer, no CSS, nothing from `render/` or `arena/`.
 *
 * The markup half — hard rule 8 on the page over every fixture, with a negative
 * control — is `story-render.test.tsx` (vitest, because it mounts JSX).
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { hashForView, viewFromLocation } from '../src/useView.ts';
import { parseFrameLog } from '../src/transport/replay.ts';
import {
  momentsOf,
  narrate,
  outlineGame,
  parseLog,
  renderStory,
  renderSummary,
  toJson,
  type CardRef,
  type Moment,
} from '../src/story/narrate.ts';
import {
  namedCardsOf,
  nextMomentCursor,
  nextTurnCursor,
  nowFrameOf,
  placementOf,
  prevMomentCursor,
  prevTurnCursor,
  segmentText,
  storyViewOf,
  turnPlacement,
} from '../src/story/page.ts';
import { STORY_KEYMAP, storyActionFor, storyRowFor } from '../src/story/keys.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(REPO + rel, 'utf8');

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
// One narrator

test('narrate.ts is the CLI narrator: both golden files, byte for byte', () => {
  const g1 = narrate(parseLog(read('fixtures/games/g1.jsonl')), { file: 'fixtures/games/g1.jsonl' });
  assert.equal(renderStory(g1, { range: [1, 3] }), read('fixtures/narrate/g1-turns-1-3.txt'));
  assert.equal(renderSummary(g1), read('fixtures/narrate/g1-summary.txt'));
});

test('tools/narrate.mjs is a shell over narrate.ts — it defines no narration of its own', () => {
  const cli = read('tools/narrate.mjs');
  assert.match(cli, /from '\.\.\/web\/src\/story\/narrate\.ts'/, 'the CLI no longer imports the module');
  for (const own of ['function faceOf', 'PHASE_LABEL', 'function tidyText', 'const refOf', 'function renderStory', 'indexState']) {
    assert.ok(!cli.includes(own), `tools/narrate.mjs defines ${own} again — a second narrator is two things to hold to hard rule 8`);
  }
  // Only the file read and the flags are the CLI's.
  assert.match(cli, /readFileSync/);
  assert.match(cli, /--summary/);
});

test('--json leaves the page\'s frameIndex out, and keeps every other key in its order', () => {
  const story = narrate(parseLog(read('fixtures/games/g1.jsonl')), { file: 'g1' });
  const json = toJson(story) as { games: Array<{ facts: Array<Record<string, unknown>> }> };
  const first = json.games[0]!.facts[0]!;
  assert.ok(!('frameIndex' in first), '--json prints frameIndex');
  assert.deepEqual(Object.keys(first).slice(0, 8), ['seq', 'prevSeq', 'turn', 'phase', 'kind', 'actor', 'cards', 'text']);
  assert.ok(story.games[0]!.facts.every((f) => typeof f.frameIndex === 'number'));
});

// ---------------------------------------------------------------------------
// Every fact knows its frame

for (const file of FIXTURES) {
  test(`${file}: every moment sits on its own frame, in order, and the outline holds each once`, () => {
    const text = read(file);
    const parsed = parseLog(text);
    const story = narrate(parsed, { file });
    let facts = 0;
    for (const game of story.games) {
      let last = -1;
      for (const f of game.facts) {
        facts += 1;
        assert.ok(f.frameIndex >= 0 && f.frameIndex < parsed.frames.length, `${f.kind} at frameIndex ${String(f.frameIndex)}`);
        assert.ok(f.frameIndex >= last, `${file}: a ${f.kind} fact at frame ${String(f.frameIndex)} after one at ${String(last)}`);
        last = f.frameIndex;
        if (f.seq !== null) {
          const frame = parsed.frames[f.frameIndex] as { type?: string; seq?: number };
          assert.equal(frame.type, 'state', `${file}: a ${f.kind} fact names seq ${String(f.seq)} but its frame is a ${String(frame.type)}`);
          assert.equal(frame.seq, f.seq, `${file}: a ${f.kind} fact's frame carries seq ${String(frame.seq)}, not ${String(f.seq)}`);
        }
      }
      const moments = momentsOf(game);
      assert.equal(moments.length, game.facts.length);
      const outline = outlineGame(game);
      const drawn = outline.setup.length + outline.turns.reduce((n, t) => n + t.runs.reduce((m, r) => m + r.moments.length, 0), 0);
      assert.equal(drawn, game.facts.length, `${file}: the outline draws ${String(drawn)} of ${String(game.facts.length)} facts`);
    }
    assert.ok(facts > 0);
  });
}

test('the page tells the CLI\'s story: the replay transport\'s parse and the CLI\'s give the same text, over the corpus', () => {
  for (const file of FIXTURES) {
    const text = read(file);
    const cli = narrate(parseLog(text), { file });
    const log = parseFrameLog(text);
    const page = narrate({ header: log.header, frames: log.frames }, { file });
    assert.equal(renderStory(page), renderStory(cli), `${file}: the page's parse tells a different story`);
    assert.equal(renderSummary(page), renderSummary(cli), `${file}: the page's parse tells a different summary`);
  }
});

test('a prefix of a bridge log tells the prefix of its story (the page\'s hidden future, D126)', () => {
  let checked = 0;
  for (const file of FIXTURES) {
    const parsed = parseLog(read(file));
    if ((parsed.header as { recordedBy?: unknown } | null)?.recordedBy === 'client') continue;
    const full = narrate(parsed);
    const n = parsed.frames.length;
    for (const cut of [1, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]) {
      const prefix = narrate({ header: parsed.header, frames: parsed.frames.slice(0, cut) });
      const want = full.games.flatMap((g) => g.facts.filter((f) => f.frameIndex < cut).map((f) => `${String(f.frameIndex)} ${f.text}`));
      const got = prefix.games.flatMap((g) => g.facts.map((f) => `${String(f.frameIndex)} ${f.text}`));
      assert.deepEqual(got, want, `${file} cut at ${String(cut)}`);
      checked += 1;
    }
  }
  assert.ok(checked >= 90, `only ${String(checked)} cuts checked`);
});

// A bound, not a benchmark: the page re-tells the whole held log on every append
// (twice a second at most, D126), and a busy gate machine must not flake this.
test('narration is cheap enough to repeat on every append: g1 well under 250 ms a telling', () => {
  const parsed = parseLog(read('fixtures/games/g1.jsonl'));
  narrate(parsed); // warm
  const t0 = performance.now();
  for (let i = 0; i < 5; i += 1) narrate(parsed);
  const each = (performance.now() - t0) / 5;
  console.log(`  narrate(g1): ${each.toFixed(1)} ms a telling (376 frames)`);
  assert.ok(each < 250, `narrating g1 took ${each.toFixed(1)} ms`);
});

// ---------------------------------------------------------------------------
// The cursor's landmarks

test('page: the moment on screen, the next and previous moment, the next and previous turn', () => {
  const frames = [3, 5, 9, 12];
  assert.equal(nowFrameOf(frames, 0), -1);
  assert.equal(nowFrameOf(frames, 3), -1, 'frame 3 has not happened at cursor 3');
  assert.equal(nowFrameOf(frames, 4), 3);
  assert.equal(nowFrameOf(frames, 11), 9);
  assert.equal(nowFrameOf(frames, 99), 12);

  assert.equal(nextMomentCursor(frames, 0), 4);
  assert.equal(nextMomentCursor(frames, 4), 6);
  assert.equal(nextMomentCursor(frames, 7), 10);
  assert.equal(nextMomentCursor(frames, 13), null);

  assert.equal(prevMomentCursor(frames, 13), 10);
  assert.equal(prevMomentCursor(frames, 11), 6, 'from between moments, back to the one before the one on screen');
  assert.equal(prevMomentCursor(frames, 4), 0, 'from the first, the session header');
  assert.equal(prevMomentCursor(frames, 0), 0);

  const starts = [3, 9];
  assert.equal(nextTurnCursor(starts, 4), 10);
  assert.equal(nextTurnCursor(starts, 10), null);
  assert.equal(prevTurnCursor(starts, frames, 13), 10, 'inside a turn: back to its start');
  assert.equal(prevTurnCursor(starts, frames, 10), 4, 'at a turn\'s start: the turn before');
  assert.equal(prevTurnCursor(starts, frames, 4), 0);

  assert.equal(placementOf(5, 6, 5), 'now');
  assert.equal(placementOf(3, 6, 5), 'past');
  assert.equal(placementOf(9, 6, 5), 'ahead');
});

test('page: a turn is past, ahead or live as one value', () => {
  const m = (frameIndex: number): Moment => ({
    turn: 1, seat: 0, phase: 'MAIN1', label: 'main 1', kind: 'land', text: 'x', frameIndex, seq: null, cards: [],
  });
  assert.equal(turnPlacement([m(1), m(2)], 10, 7), 'past');
  assert.equal(turnPlacement([m(11), m(12)], 10, 7), 'ahead');
  assert.equal(turnPlacement([m(7), m(12)], 10, 7), 'live');
  assert.equal(turnPlacement([m(1), m(7)], 10, 7), 'live', 'holding the moment on screen makes a turn live');
});

test('page: the view over g1 — every moment-bearing frame, every turn start', () => {
  const story = narrate(parseLog(read('fixtures/games/g1.jsonl')));
  const view = storyViewOf(story);
  assert.equal(view.count, story.games[0]!.facts.length);
  assert.ok(view.frames.every((f, i) => i === 0 || f > view.frames[i - 1]!), 'frames ascending and unique');
  assert.ok(view.turnStarts.length >= 20, `${String(view.turnStarts.length)} turn starts`);
  assert.ok(view.turnStarts.every((f) => view.frames.includes(f)));
});

test('segmentText: marks only the names the narrator resolved, longest first, whole words', () => {
  const cards: CardRef[] = [
    { id: 1, name: 'Aerial Doombot' },
    { id: 2, name: 'Doombot' },
    { id: 3, name: null },
    { id: 4, name: 'Island' },
  ];
  const pieces = segmentText("AI-Seat1's Aerial Doombot blocks a card; Doombot and Islands, Island.", cards);
  assert.deepEqual(
    pieces.filter((p) => p.card !== null).map((p) => [p.text, p.card!.id]),
    [
      ['Aerial Doombot', 1],
      ['Doombot', 2],
      ['Island', 4],
    ],
  );
  assert.equal(pieces.map((p) => p.text).join(''), "AI-Seat1's Aerial Doombot blocks a card; Doombot and Islands, Island.");
  assert.deepEqual(segmentText('Draws a card.', [{ id: 9, name: null }]), [{ text: 'Draws a card.', card: null }]);
  // A regex character in a name is a character.
  assert.equal(segmentText('Casts HULK SMASH! (…)', [{ id: 5, name: 'HULK SMASH!' }])[1]?.card?.id, 5);
});

test('namedCardsOf: face-up names only, each once — a face-down or unseen card has no image', () => {
  const m = (cards: CardRef[]): Moment => ({
    turn: 1, seat: 0, phase: 'MAIN1', label: 'main 1', kind: 'cast', text: '', frameIndex: 1, seq: 1, cards,
  });
  const got = namedCardsOf([
    m([{ id: 1, name: 'Quake, Agent of S.H.I.E.L.D.' }, { id: 2, name: null }]),
    m([{ id: 3, name: 'Ashcloud Phoenix', faceDown: true }, { id: 4, name: 'Quake, Agent of S.H.I.E.L.D.' }]),
  ]);
  assert.deepEqual(got.map((c) => c.id), [1]);
});

// ---------------------------------------------------------------------------
// The keymap

test('keys: one row per action, every chord planned to its own action, and fields keep their keys', () => {
  const actions = STORY_KEYMAP.map((r) => r.action);
  assert.equal(new Set(actions).size, actions.length, 'an action is bound twice');
  const keys = STORY_KEYMAP.flatMap((r) => r.keys);
  assert.equal(new Set(keys).size, keys.length, 'a key is bound twice');
  const plain = { ctrlKey: false, metaKey: false, altKey: false, target: null };
  for (const row of STORY_KEYMAP) {
    for (const key of row.keys) assert.equal(storyActionFor({ key, ...plain }), row.action, `${key} → ${row.action}`);
  }
  assert.equal(storyActionFor({ key: 'ArrowRight', ...plain, ctrlKey: true }), null, 'a browser shortcut is never ours');
  assert.equal(storyActionFor({ key: 'ArrowRight', ...plain, target: { tagName: 'INPUT' } }), null, 'the scrubber keeps its arrows');
  assert.equal(storyActionFor({ key: 'ArrowDown', ...plain, target: { tagName: 'SELECT' } }), null, 'the speed menu keeps its arrows');
  assert.equal(storyActionFor({ key: ' ', ...plain, target: { tagName: 'BUTTON' } }), null, 'a focused moment keeps Space');
  assert.equal(storyActionFor({ key: 'ArrowRight', ...plain, target: { tagName: 'BUTTON' } }), 'nextMoment');
  assert.equal(storyRowFor('q'), null);
});

test('keys: Story.tsx maps every action in one Record and branches on no key name', () => {
  const src = read('web/src/story/Story.tsx');
  assert.match(src, /Record<StoryKeyAction, \(\) => void>/);
  assert.doesNotMatch(src, /case '(?:Arrow\w+|[a-zA-Z,. ]|Home|End)':/, 'a key name in a switch: add a row to story/keys.ts instead');
});

// ---------------------------------------------------------------------------
// The page's boundaries

const storyFiles = (): string[] =>
  readdirSync(REPO + 'web/src/story')
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .sort();

const importsOf = (src: string): string[] => [...src.matchAll(/^import[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1] ?? '');

test('route: #story, #/story and ?view=story open the story; the hash is #story', () => {
  assert.equal(viewFromLocation('#story', ''), 'story');
  assert.equal(viewFromLocation('#/story', ''), 'story');
  assert.equal(viewFromLocation('', '?replay=games/g1.jsonl&view=story'), 'story');
  assert.equal(viewFromLocation('#arena', '?view=story'), 'arena', 'the hash still wins');
  assert.equal(viewFromLocation('#storyx', ''), 'board', 'a typo is the board');
  assert.equal(hashForView('story'), '#story');
});

test('route: the story is a lazy chunk — main.tsx reaches it only through lazy(), and nothing else reaches it', () => {
  const main = read('web/src/main.tsx');
  assert.match(main, /lazy\(\(\) => import\('\.\/story\/Story\.tsx'\)\)/);
  assert.deepEqual(
    importsOf(main).filter((p) => p.startsWith('./story/')),
    [],
    'a static import of ./story/ would put the page in the 2D entry chunk',
  );
  // No other module under web/src imports the page (the CLI in tools/ does, by design).
  const walk = (dir: string): string[] =>
    readdirSync(REPO + dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(`${dir}${d.name}/`) : /\.(ts|tsx)$/.test(d.name) ? [`${dir}${d.name}`] : [],
    );
  for (const file of walk('web/src/')) {
    if (file.startsWith('web/src/story/') || file === 'web/src/main.tsx') continue;
    assert.ok(!importsOf(read(file)).some((p) => p.includes('story/')), `${file} imports the story page`);
  }
});

test('liveness: the story page imports no transport, nothing from render/ arena/ cards/ workshop/, and no CSS', () => {
  const files = storyFiles();
  assert.deepEqual(files, ['Story.tsx', 'keys.ts', 'narrate.ts', 'page.ts'], 'story/ changed: extend this test with it');
  for (const file of files) {
    const src = read(`web/src/story/${file}`);
    for (const path of importsOf(src)) {
      assert.ok(!/transport\//.test(path), `${file} imports a transport (${path}) — main.tsx owns it and hands the page frames`);
      assert.ok(!/(?:^|\/)(render|arena|cards|workshop)\//.test(path), `${file} imports ${path}`);
    }
    assert.doesNotMatch(src, /^import\s+['"][^'"]+\.css['"]/m, `${file} imports CSS (styles.css holds every rule)`);
  }
});

test('liveness: the story page never fetches, opens no socket and starts no timer', () => {
  for (const file of storyFiles()) {
    const src = read(`web/src/story/${file}`)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    for (const banned of [/\bfetch\(/, /\bnew WebSocket\b/, /\bXMLHttpRequest\b/, /\bset(?:Timeout|Interval)\(/, /\blocalStorage\b/, /\bimport\(/]) {
      assert.doesNotMatch(src, banned, `${file}: ${String(banned)}`);
    }
  }
});

test('liveness: narrate.ts imports nothing and reaches no host — no node:, no DOM, no clock', () => {
  const src = read('web/src/story/narrate.ts')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  assert.deepEqual(importsOf(src), [], 'narrate.ts imports something: it must stay loadable by `node tools/narrate.mjs` as it is');
  for (const banned of [/\bnode:/, /\bdocument\./, /\bwindow\./, /\bDate\.now\b/, /\bperformance\./, /\bprocess\./, /\brequire\(/]) {
    assert.doesNotMatch(src, banned, `narrate.ts: ${String(banned)}`);
  }
  // Node's type stripping takes erasable syntax only.
  assert.doesNotMatch(src, /^\s*(?:export\s+)?(?:const\s+)?enum\s/m, 'an enum is not erasable');
  assert.doesNotMatch(src, /^\s*(?:export\s+)?namespace\s/m, 'a namespace is not erasable');
  for (const file of ['page.ts', 'keys.ts']) {
    assert.ok(!importsOf(read(`web/src/story/${file}`)).includes('react'), `${file} imports React`);
  }
});

test('spectate.sh --story opens #story', () => {
  const sh = read('scripts/spectate.sh');
  assert.match(sh, /--story\)\s+VIEW=story/);
  assert.match(sh, /\[ "\$VIEW" = "story" \] && PAGE="\$PAGE#story"/);
});

test('liveness: the story\'s one card image — a name a fact carries, face up, and written down as M4 convention 2\'s exemption', () => {
  const src = read('web/src/story/Story.tsx');
  assert.equal((src.match(/\bimageUrl\(/g) ?? []).length, 1, 'a second card-image surface on the story page is a decision');
  assert.equal((src.match(/\blookupArt\(/g) ?? []).length, 1);
  // The one lookup is by the name of a CardRef the narrator resolved — never by id.
  assert.match(src, /card\.name === null \? null : lookupArt\(art, card\.name\)/);
  // And the images are of the cards `namedCardsOf` picks: face up, named.
  assert.match(src, /const cards = namedCardsOf\(moments\)/);
  for (const banned of ['CardTile', 'CardPlane', 'CardView']) {
    assert.ok(!src.includes(`${banned}.tsx`), `Story.tsx imports ${banned} — the story is not a card renderer`);
  }
  const claude = read('CLAUDE.md');
  assert.match(claude, /The story page \(`#story`\) draws a card image/, 'the exemption is not written down in M4 convention 2');
});
