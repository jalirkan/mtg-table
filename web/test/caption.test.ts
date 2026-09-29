/*
 * mtg-table — web/test/caption.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arena's caption, its pure half** (D255, D256). What `node --test` can
 * hold without JSX:
 *
 *   - `story/caption.ts` picks, at every cursor of every committed log, exactly
 *     the frame on screen's moments and the one or two before them — checked
 *     against a naive reading of the facts written here, apart from it — and, on
 *     every frame it shows, ends on the moment `#story` highlights at that cursor
 *     (one narrator, one cursor: the page and the strip say the same thing);
 *   - the LIVE feed: a seat's frames recorded off the socket (`liveLog.ts`), with
 *     the log's own resyncs re-delivered as a client hears them, caption every
 *     `state` exactly as the replay of the bridge's log captions the same frame
 *     — except where the replay's caption holds a moment told from the seat's own
 *     `c2s` frames (a concede, a sideboard answer), which a socket client never
 *     hears back; the census says how many and which;
 *   - the stored choice (two contexts, two defaults), `LiveFrameLog`'s one rule;
 *   - where the strip sits: its rectangle is the stylesheet's (`CAPTION_BOX`),
 *     it is above your seat plate, the busiest caption fits its cap, and over
 *     every board frame of the corpus at the table view it covers no card of a
 *     hand, no stack item, no duelist and (at 1280 px and wider) no battlefield
 *     card — measured and printed, with the bottom centre, the obvious subtitle
 *     spot, as the negative control that covers your hand.
 *
 * The markup half — hard rule 8 over every frame of every fixture, with a
 * negative control — is `arena-caption.test.tsx` (vitest, because it mounts JSX).
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CAPTION_BOX,
  CAPTION_DEFAULT,
  CAPTION_STORE_KEY,
  captionChoiceOf,
  captionContextOf,
  captionRectOf,
  storedCaptionWith,
  type ArenaCaption,
} from '../src/arena/caption.ts';
import { CAMERA, PLAYER_PLATES, VIEW_BY_ID, projectToNdc, underRect, type CornerRect } from '../src/arena/camera.ts';
import duelistsJson from '../src/arena/figures/duelists.json' with { type: 'json' };
import { duelistHeight, duelistSamples, validateDuelists } from '../src/arena/figures/duelists.ts';
import { CARD_W, FIGURE_HEIGHT, layout, standPointOf, type Placement } from '../src/arena/layout.ts';
import { LiveFrameLog } from '../src/liveLog.ts';
import type { Frame } from '../src/protocol.ts';
import { initialState, reduce } from '../src/reduce.ts';
import { CAPTION_NOW_MAX, captionAt, captionIndexOf, type Caption } from '../src/story/caption.ts';
import { narrate, outlineGame, whoTag, type Moment } from '../src/story/narrate.ts';
import { nowFrameOf, nowMoments, storyViewOf } from '../src/story/page.ts';
import { parseFrameLog, type ParsedFrameLog } from '../src/transport/replay.ts';

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

const logs = new Map<string, ParsedFrameLog>();
const logOf = (file: string): ParsedFrameLog => {
  const hit = logs.get(file);
  if (hit !== undefined) return hit;
  const log = parseFrameLog(read(file));
  logs.set(file, log);
  return log;
};

/** A caption as text only — what a reader sees, for comparing two of them. */
const textOf = (c: Caption | ArenaCaption | null): string =>
  c === null
    ? 'null'
    : JSON.stringify({
        turn: c.turn,
        side: c.side,
        before: c.before.map((l) => [l.turn, l.text]),
        now: c.now.map((l) => [l.turn, l.text]),
        more: c.more,
      });

// ---------------------------------------------------------------------------
// Which moments, at which cursor

/**
 * The naive reading, written apart from `caption.ts`: the frame on screen is the
 * last server `state` before the cursor (none after a newer `hello_ok`), and its
 * moments are the facts of frames from it up to the cursor.
 */
function naive(log: ParsedFrameLog, facts: ReadonlyArray<{ game: number; fact: Moment }>, cursor: number): {
  now: string[];
  before: string[];
  nowTurns: number[];
  beforeTurns: number[];
  more: number;
  turn: number;
  game: number;
} | null {
  let state = -1;
  let hello = -1;
  for (let i = 0; i < Math.min(cursor, log.frames.length); i++) {
    const f = log.frames[i]!;
    if ((f.dir ?? 's2c') !== 's2c') continue;
    if (f.type === 'state') state = i;
    if (f.type === 'hello_ok') hello = i;
  }
  if (state < 0 || hello > state) return null;
  const nowAll = facts.filter((x) => x.fact.frameIndex >= state && x.fact.frameIndex < cursor);
  if (nowAll.length === 0) return null;
  const game = nowAll[0]!.game;
  const fits = nowAll.length <= CAPTION_NOW_MAX ? nowAll : nowAll.slice(0, CAPTION_NOW_MAX - 1);
  const firstAt = facts.indexOf(nowAll[0]!);
  const earlier = facts.slice(0, firstAt).filter((x) => x.game === game);
  const before = earlier.slice(Math.max(0, earlier.length - (fits.length === 1 ? 2 : 1)));
  return {
    now: fits.map((x) => x.fact.text),
    before: before.map((x) => x.fact.text),
    nowTurns: fits.map((x) => x.fact.turn),
    beforeTurns: before.map((x) => x.fact.turn),
    more: nowAll.length - fits.length,
    turn: fits[fits.length - 1]!.fact.turn,
    game,
  };
}

test('caption: at every cursor of every log, the frame on screen’s moments and the one or two before them', () => {
  const census: string[] = [];
  let shown = 0;
  let hidden = 0;
  let spans = 0;
  let markers = 0;
  for (const file of FIXTURES) {
    const log = logOf(file);
    const index = captionIndexOf(log.header, log.frames);
    const story = narrate({ header: log.header, frames: log.frames });
    // The story page's order (setup, then each turn's runs), then by frame.
    const facts = story.games
      .flatMap((game, g) => {
        const outline = outlineGame(game);
        return [...outline.setup, ...outline.turns.flatMap((t) => t.runs.flatMap((r) => r.moments))].map((fact) => ({ game: g, fact }));
      })
      .map((x, order) => ({ ...x, order }))
      .sort((a, b) => a.fact.frameIndex - b.fact.frameIndex || a.order - b.order);
    assert.equal(facts.length, story.games.reduce((k, g) => k + g.facts.length, 0), `${file}: the outline does not hold every fact once`);
    let fileShown = 0;
    let busiest = 0;
    for (let cursor = 0; cursor <= log.frames.length; cursor++) {
      const got = captionAt(index, cursor);
      const want = naive(log, facts, cursor);
      if (want === null) {
        assert.equal(got, null, `${file} @${String(cursor)}: a caption on a frame no moment names`);
        hidden += 1;
        continue;
      }
      assert.ok(got !== null, `${file} @${String(cursor)}: no caption, and the frame on screen has ${String(want.now.length)} moment(s)`);
      assert.deepEqual(got.now.map((l) => l.text), want.now, `${file} @${String(cursor)}: now`);
      assert.deepEqual(got.before.map((l) => l.text), want.before, `${file} @${String(cursor)}: before`);
      assert.equal(got.more, want.more, `${file} @${String(cursor)}: more`);
      // The markers: every line under the story page's own heading for ITS turn,
      // and the strip's own turn the last line's.
      const game = story.games[want.game]!;
      const headingOf = (t: number): { turn: string; side: 'you' | 'opp' | null } => {
        const player = game.turns.find((r) => r.turn === t)?.player;
        if (t === 0) return { turn: 'Before the game', side: null };
        if (typeof player !== 'number') return { turn: `Turn ${String(t)}`, side: null };
        return { turn: `Turn ${String(t)} · ${whoTag(game, player)}`, side: game.you === null ? null : player === game.you ? 'you' : 'opp' };
      };
      assert.deepEqual(
        [...got.before, ...got.now].map((l) => ({ turn: l.turn, side: l.side })),
        [...want.beforeTurns, ...want.nowTurns].map(headingOf),
        `${file} @${String(cursor)}: a line under the wrong turn`,
      );
      assert.deepEqual({ turn: got.turn, side: got.side }, headingOf(want.turn), `${file} @${String(cursor)}: the strip's turn`);
      if (new Set([...got.before, ...got.now].map((l) => l.turn)).size > 1) spans += 1;
      markers = Math.max(markers, new Set([...got.before, ...got.now].map((l) => l.turn)).size);
      // Every line is its sentence, cut only at the names the narrator resolved.
      for (const line of [...got.before, ...got.now]) {
        assert.equal(line.pieces.map((p) => p.text).join(''), line.text, `${file} @${String(cursor)}: pieces do not spell the sentence`);
      }
      shown += 1;
      fileShown += 1;
      busiest = Math.max(busiest, got.now.length + got.before.length + (got.more > 0 ? 1 : 0));
    }
    census.push(`${file.replace(/^fixtures\//, '').padEnd(36)} ${String(fileShown).padStart(5)} of ${String(log.frames.length + 1).padStart(5)} cursors captioned, at most ${String(busiest)} lines`);
  }
  for (const line of census) console.log(`  ${line}`);
  console.log(
    `  caption: shown at ${String(shown)} cursors, hidden at ${String(hidden)}; ` +
      `${String(spans)} of them span two turns or more (at most ${String(markers)} markers)`,
  );
  assert.ok(shown > 1000 && hidden > 1000, 'the sweep should both show and hide the strip');
});

test('caption: on every frame it shows, it ends on the moment #story highlights at that cursor', () => {
  let checked = 0;
  for (const file of FIXTURES) {
    const log = logOf(file);
    const index = captionIndexOf(log.header, log.frames);
    const view = storyViewOf(index.story);
    for (let cursor = 0; cursor <= log.frames.length; cursor++) {
      const caption = captionAt(index, cursor);
      if (caption === null || caption.more > 0) continue;
      const highlighted = nowMoments(view, nowFrameOf(view.frames, cursor)).map((m) => m.text);
      assert.ok(highlighted.length > 0, `${file} @${String(cursor)}: the story highlights nothing where the caption shows`);
      assert.deepEqual(
        caption.now.map((l) => l.text).slice(-highlighted.length),
        highlighted,
        `${file} @${String(cursor)}: the strip and #story tell different moments at one cursor`,
      );
      checked += 1;
    }
  }
  console.log(`  caption = #story's highlighted moment at ${String(checked)} cursors`);
  assert.ok(checked > 1000);
});

test('caption: the strip hides before the first snapshot, on a quiet frame and at a new game', () => {
  const g1 = logOf('fixtures/games/g1.jsonl');
  const index = captionIndexOf(g1.header, g1.frames);
  assert.equal(captionAt(index, 0), null, 'no frame applied');
  assert.equal(captionAt(index, 1), null, 'only the handshake');
  // A snapshot the narrator has nothing to say about: a quiet frame.
  const quiet = index.stateFrames.find((s) => !index.entries.some((e) => e.moment.frameIndex === s));
  assert.ok(quiet !== undefined, 'g1 has no quiet state frame');
  assert.equal(captionAt(index, quiet + 1), null, `g1 @${String(quiet + 1)} is quiet and still captioned`);
  // g1@208: the moment the story page's evidence shows at that frame.
  const at208 = captionAt(index, 208);
  assert.ok(at208 !== null);
  assert.deepEqual(at208.now.map((l) => l.text), ['Casts Aerial Doombot ({U}, artifact creature 1/1).']);
  assert.equal(at208.before.length, 2);
  assert.equal(at208.turn, 'Turn 14 · AI-Seat1 (AI)');
  assert.equal(at208.side, 'opp');
  const doombot = at208.now[0]!.pieces.find((p) => p.card !== null);
  assert.equal(doombot?.card?.name, 'Aerial Doombot');
  // A new game's handshake (D44: a live seat's second game): the board is reset,
  // and nothing is captioned until the new game's first snapshot. Every committed
  // log is one game (D44), so the second one's hello_ok is spliced in right after
  // a captioned frame.
  const hello = g1.frames.find((f) => f.type === 'hello_ok')!;
  const next = [...g1.frames.slice(0, 208), { ...hello, seq: 9999, body: { ...(hello.body as object), gameId: 'g1-next' } } as Frame];
  const twoIndex = captionIndexOf(g1.header, next);
  assert.notEqual(captionAt(twoIndex, 208), null, 'g1@208 is captioned');
  assert.equal(captionAt(twoIndex, 209), null, 'a caption over a board that the new game has reset');
});

// ---------------------------------------------------------------------------
// The live feed

test('LiveFrameLog: one game, whole — a new gameId starts again, a re-delivered hello_ok is kept, pings are not the game', () => {
  const log = new LiveFrameLog();
  const hello = (gameId: string, seq: number): Frame =>
    ({ v: 1, seq, t: 0, type: 'hello_ok', body: { gameId, you: 1, players: [] } }) as unknown as Frame;
  const state = (seq: number): Frame => ({ v: 1, seq, t: 0, type: 'state', body: {} }) as unknown as Frame;
  log.push(state(1));
  assert.equal(log.frames.length, 0, 'a frame before any handshake is not a game');
  log.push(hello('a', 1));
  log.push(state(2));
  log.push({ v: 1, seq: 0, t: 0, type: 'ping', body: {} } as unknown as Frame);
  log.push({ v: 1, seq: 0, t: 0, type: 'notice', body: {} } as unknown as Frame);
  log.push({ v: 1, seq: 9, t: 0, dir: 'c2s', type: 'act', body: { action: 'concede' } } as unknown as Frame);
  assert.equal(log.frames.length, 2, 'a ping, a seq-0 refusal and a c2s frame are not recorded');
  const version = log.version;
  log.push(hello('a', 1)); // a resync's verbatim re-delivery
  assert.equal(log.frames.length, 3, 'a re-delivered hello_ok is kept, as a client log keeps it');
  assert.ok(log.version > version);
  assert.deepEqual(log.header, { kind: 'session', recordedBy: 'client', gameId: 'a', seat: 1 });
  log.push(hello('b', 7));
  assert.equal(log.frames.length, 1, 'a new gameId is a new game (D44)');
  assert.equal(log.header.gameId, 'b');
});

/**
 * A bridge log as its seat's socket delivered it: the server frames in order and,
 * at each of the log's own `resync`s, the handshake, the last snapshot and every
 * open ask again, verbatim (amendment M10) — what `tools/narrate-selftest.mjs`
 * builds for its client log, fed frame by frame.
 */
function* socketOf(log: ParsedFrameLog): Generator<{ frame: Frame; at: number }> {
  let lastHello: Frame | null = null;
  let lastState: Frame | null = null;
  const asks = new Map<string, Frame>();
  for (let i = 0; i < log.frames.length; i++) {
    const f = log.frames[i]!;
    if (f.dir === 'c2s') {
      if (f.type === 'resync') {
        for (const again of [lastHello, lastState, ...asks.values()]) if (again !== null) yield { frame: again, at: -1 };
      }
      if (f.type === 'answer') asks.delete((f.body as { askId: string }).askId);
      continue;
    }
    if (f.type === 'hello_ok') lastHello = f;
    if (f.type === 'state') lastState = f;
    if (f.type === 'ask') asks.set((f.body as { askId: string }).askId, f);
    yield { frame: f, at: i };
  }
}

test('caption: a live seat’s caption is the replay’s, frame for frame — but a moment told from its own c2s frames', () => {
  const started = performance.now();
  let compared = 0;
  const excused: string[] = [];
  const census: string[] = [];
  for (const file of FIXTURES) {
    const log = logOf(file);
    const replay = captionIndexOf(log.header, log.frames);
    const live = new LiveFrameLog();
    let fileCompared = 0;
    let redelivered = 0;
    for (const { frame, at } of socketOf(log)) {
      live.push(frame);
      if (at < 0) {
        redelivered += 1;
        continue;
      }
      if (frame.type !== 'state') continue;
      const mine = captionAt(captionIndexOf(live.header, live.frames), live.frames.length);
      const theirs = captionAt(replay, at + 1);
      fileCompared += 1;
      if (textOf(mine) === textOf(theirs)) continue;
      // The one difference there may be: the replay's caption holds a moment the
      // narrator told from a c2s frame (the seat's concede or sideboard answer),
      // which the socket never sends back to the client.
      const own = replay.entries.filter(
        (e) => (e.moment.kind === 'concede' || e.moment.kind === 'sideboard') && e.moment.frameIndex <= at,
      );
      assert.ok(own.length > 0, `${file} @${String(at + 1)}: the live caption differs from the replay's\n  live:   ${textOf(mine)}\n  replay: ${textOf(theirs)}`);
      excused.push(`${file} @${String(at + 1)} (${own.map((e) => e.moment.kind).join(', ')})`);
    }
    compared += fileCompared;
    census.push(`${file.replace(/^fixtures\//, '').padEnd(36)} ${String(fileCompared).padStart(4)} states compared, ${String(redelivered)} frames re-delivered`);
  }
  for (const line of census) console.log(`  ${line}`);
  console.log(`  live = replay at ${String(compared - excused.length)} of ${String(compared)} states; ` +
    `excused (a c2s moment): ${excused.length === 0 ? 'none' : excused.join('; ')}; ${(performance.now() - started).toFixed(0)} ms`);
  assert.ok(compared > 3000, 'the live sweep compared too few frames');
  assert.ok(excused.length <= 5, `more frames differ than the c2s moments explain: ${excused.join('; ')}`);
});

// ---------------------------------------------------------------------------
// The choice (D256)

test('caption: two contexts, two defaults, kept apart — and garbage is the default', () => {
  assert.equal(CAPTION_STORE_KEY, 'mtg-table.arena.caption');
  assert.deepEqual(CAPTION_DEFAULT, { watch: true, seat: false });
  assert.equal(captionContextOf(false), 'watch', 'a replay has no act to send: it watches');
  assert.equal(captionContextOf(true), 'seat');
  assert.equal(captionChoiceOf(null, 'watch'), true, 'on by default in a replay and while spectating');
  assert.equal(captionChoiceOf(null, 'seat'), false, 'off by default at a live seat');
  for (const garbage of ['', 'true', '{', '[]', '{"watch":"yes"}', 'null']) {
    assert.equal(captionChoiceOf(garbage, 'watch'), true, JSON.stringify(garbage));
    assert.equal(captionChoiceOf(garbage, 'seat'), false, JSON.stringify(garbage));
  }
  // Turning it on at a seat leaves the replays' choice alone, and the other way round.
  const seatOn = storedCaptionWith(null, 'seat', true);
  assert.equal(captionChoiceOf(seatOn, 'seat'), true);
  assert.equal(captionChoiceOf(seatOn, 'watch'), true);
  const watchOff = storedCaptionWith(seatOn, 'watch', false);
  assert.equal(captionChoiceOf(watchOff, 'watch'), false);
  assert.equal(captionChoiceOf(watchOff, 'seat'), true);
});

// ---------------------------------------------------------------------------
// Where it sits (D256)

const css = read('web/src/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
function rule(selector: string): Record<string, string> {
  const at = css.indexOf(`\n${selector} {`);
  assert.ok(at >= 0, `styles.css has no top-level ${selector} rule`);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  const out: Record<string, string> = {};
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon > 0) out[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim();
  }
  return out;
}
const px = (value: string | undefined): number => {
  const m = /^([\d.]+)(rem|px)$/.exec(value ?? '');
  assert.ok(m !== null, `not a length in rem or px: ${String(value)}`);
  return Number(m[1]) * (m[2] === 'rem' ? 16 : 1);
};

test('caption: its rectangle is the stylesheet’s, above your plate, and the busiest caption fits its cap', () => {
  const box = rule('.arena__caption');
  assert.equal(box['pointer-events'], 'auto');
  assert.equal(box['position'], 'absolute');
  assert.equal(box['box-sizing'], 'border-box');
  assert.equal(px(box['inset-inline-end']), CAPTION_BOX.insetEndPx);
  assert.equal(px(box['inset-block-end']), CAPTION_BOX.insetBottomPx);
  const size = /^min\(([\d.]+rem), ([\d.]+)vw\)$/.exec(box['inline-size'] ?? '');
  assert.ok(size !== null, `.arena__caption { inline-size } is ${String(box['inline-size'])}, not min(<rem>, <vw>)`);
  assert.equal(px(size[1]), CAPTION_BOX.maxWidthPx);
  assert.equal(Number(size[2]), CAPTION_BOX.widthVw);
  assert.equal(px(box['max-block-size']), CAPTION_BOX.maxHeightPx);
  assert.equal(box['overflow'], 'hidden', 'the cap is a bound only if what passes it is cut');
  // Above your plate: it grows upward from over its top edge.
  const plateTop = PLAYER_PLATES.you.insetY + PLAYER_PLATES.you.height;
  assert.ok(CAPTION_BOX.insetBottomPx > plateTop, `the strip starts ${String(CAPTION_BOX.insetBottomPx)} px up, your plate ends ${plateTop.toFixed(1)} px up`);
  assert.equal(CAPTION_BOX.insetEndPx, PLAYER_PLATES.you.insetX, 'the strip lines up with the plates');
  // The busiest caption that must fit: two turn markers (an earlier line from the
  // turn before), one earlier line (one row), CAPTION_NOW_MAX current lines (two
  // rows each), between the row gaps. A third marker is rarer, and the column is
  // cut at the top (`justify-content: flex-end`), the oldest line first.
  assert.equal(box['justify-content'], 'flex-end', 'an overfull strip must lose its oldest line, not its newest');
  const [padBlock] = (box['padding'] ?? '').split(/\s+/).map(px);
  const border = px((box['border'] ?? '').split(/\s+/)[0]);
  const gap = px(box['gap']);
  const lineHeight = Number(box['line-height']);
  const uiPx = px(box['font-size']);
  const turnPx = px(rule('.arena__caption-turn')['font-size']);
  assert.equal(rule('.arena__caption-line')['-webkit-line-clamp'], '2');
  assert.equal(rule('.arena__caption-line--before')['-webkit-line-clamp'], '1');
  const rows = [turnPx * lineHeight, uiPx * lineHeight, turnPx * lineHeight, ...Array.from({ length: CAPTION_NOW_MAX }, () => 2 * uiPx * lineHeight)];
  const busiest = 2 * padBlock! + 2 * border + (rows.length - 1) * gap + rows.reduce((a, b) => a + b, 0);
  console.log(`  the busiest caption: ${busiest.toFixed(1)} px of a ${String(CAPTION_BOX.maxHeightPx)}-px cap`);
  assert.ok(busiest <= CAPTION_BOX.maxHeightPx, `the busiest caption is ${busiest.toFixed(1)} px, over the cap`);
  // And every caption the corpus makes, at its upper bound (every current line
  // two rows), fits: the cut at the top is for a shape no recording has shown.
  const moreRow = px(rule('.arena__caption-more')['font-size']) * lineHeight;
  let tallest = 0;
  for (const file of FIXTURES) {
    const log = logOf(file);
    const index = captionIndexOf(log.header, log.frames);
    for (let cursor = 0; cursor <= log.frames.length; cursor++) {
      const c = captionAt(index, cursor);
      if (c === null) continue;
      const markers = new Set([...c.before, ...c.now].map((l) => l.turn)).size;
      const heights = [
        ...Array.from({ length: markers }, () => turnPx * lineHeight),
        ...c.before.map(() => uiPx * lineHeight),
        ...c.now.map(() => 2 * uiPx * lineHeight),
        ...(c.more > 0 ? [moreRow] : []),
      ];
      const height = 2 * padBlock! + 2 * border + (heights.length - 1) * gap + heights.reduce((a, b) => a + b, 0);
      tallest = Math.max(tallest, height);
      assert.ok(height <= CAPTION_BOX.maxHeightPx, `${file} @${String(cursor)}: a caption of ${height.toFixed(1)} px, over the cap`);
    }
  }
  console.log(`  the corpus's tallest caption, at its upper bound: ${tallest.toFixed(1)} px`);
});

/** A card's four world corners as `CardPlane` draws it: `CARD_W × 1`, scaled, three's XYZ Euler. */
function cardCorners(p: Placement): Array<[number, number, number]> {
  const [rx, ry, rz] = p.rotation;
  const out: Array<[number, number, number]> = [];
  for (const [lx, ly] of [
    [-CARD_W / 2, -0.5],
    [CARD_W / 2, -0.5],
    [CARD_W / 2, 0.5],
    [-CARD_W / 2, 0.5],
  ] as const) {
    const x = lx * p.scale;
    const y = ly * p.scale;
    const x1 = x * Math.cos(rz) - y * Math.sin(rz);
    const y1 = x * Math.sin(rz) + y * Math.cos(rz);
    const x2 = x1 * Math.cos(ry);
    const z2 = -x1 * Math.sin(ry);
    const y3 = y1 * Math.cos(rx) - z2 * Math.sin(rx);
    const z3 = y1 * Math.sin(rx) + z2 * Math.cos(rx);
    out.push([x2 + p.position[0], y3 + p.position[1], z3 + p.position[2]]);
  }
  return out;
}

type Box = { left: number; top: number; right: number; bottom: number };
const rectBox = (r: CornerRect, width: number, height: number): Box => {
  const left = r.corner.endsWith('left') ? r.insetX : width - r.insetX - r.width;
  const top = r.corner.startsWith('top') ? r.insetY : height - r.insetY - r.height;
  return { left, top, right: left + r.width, bottom: top + r.height };
};

/** How much of `thing` (its screen box) the strip covers — its share of the thing's area. */
const coverOf = (thing: Box, strip: Box): number => {
  const w = Math.max(0, Math.min(thing.right, strip.right) - Math.max(thing.left, strip.left));
  const h = Math.max(0, Math.min(thing.bottom, strip.bottom) - Math.max(thing.top, strip.top));
  const area = (thing.right - thing.left) * (thing.bottom - thing.top);
  return area <= 0 ? 0 : (w * h) / area;
};

/**
 * The canvases the arena is played on: a 1600 × 1000 window less a replay's two
 * bars (944) or a live seat's one (974), and around it.
 */
const CANVASES: ReadonlyArray<{ width: number; height: number }> = [
  { width: 1024, height: 700 },
  { width: 1280, height: 660 },
  { width: 1366, height: 680 },
  { width: 1440, height: 800 },
  { width: 1600, height: 944 },
  { width: 1600, height: 974 },
  { width: 1920, height: 1000 },
  { width: 2560, height: 1340 },
];

interface Tally {
  things: number;
  hand: number;
  stack: number;
  battlefield: number;
  piles: number;
  frames: number;
  framesHit: number;
}

/** Every board frame of the corpus at a view (the table's by default), each thing on it against a rectangle per canvas. */
function measure(rectFor: (width: number) => CornerRect, view: keyof typeof VIEW_BY_ID = 'table'): Map<string, Tally> {
  const pose = VIEW_BY_ID[view].pose;
  const out = new Map<string, Tally>();
  for (const canvas of CANVASES) {
    out.set(`${String(canvas.width)}x${String(canvas.height)}`, { things: 0, hand: 0, stack: 0, battlefield: 0, piles: 0, frames: 0, framesHit: 0 });
  }
  for (const file of FIXTURES) {
    const log = logOf(file);
    let state = initialState(log.header);
    for (const frame of log.frames) {
      state = reduce(state, frame);
      if (frame.type !== 'state' || state.board === null) continue;
      const placed = layout(state, {});
      for (const canvas of CANVASES) {
        const tally = out.get(`${String(canvas.width)}x${String(canvas.height)}`)!;
        const aspect = canvas.width / canvas.height;
        const strip = rectBox(rectFor(canvas.width), canvas.width, canvas.height);
        let hit = false;
        tally.frames += 1;
        for (const p of placed.placements) {
          const points = cardCorners(p);
          // A creature stands on its card: its figure's top is part of what it is.
          if (p.kind === 'creature') {
            const at = standPointOf(p);
            points.push([at[0], at[1] + FIGURE_HEIGHT, at[2]]);
          }
          const ndc = points.map((q) => projectToNdc(pose, q, CAMERA.fov, aspect));
          if (ndc.some((q) => q === null)) continue;
          const xs = ndc.map((q) => ((q![0] + 1) / 2) * canvas.width);
          const ys = ndc.map((q) => ((1 - q![1]) / 2) * canvas.height);
          const box = { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
          tally.things += 1;
          if (coverOf(box, strip) < 0.1) continue;
          hit = true;
          if (p.kind === 'hand') tally.hand += 1;
          else if (p.kind === 'stack') tally.stack += 1;
          else if (p.kind === 'graveyard' || p.kind === 'exile' || p.kind === 'command') tally.piles += 1;
          else tally.battlefield += 1;
        }
        if (hit) tally.framesHit += 1;
      }
    }
  }
  return out;
}

test('caption: over every board frame at the table view the strip covers no hand, no stack and no duelist — the bottom centre covers your hand', () => {
  const tallies = measure(captionRectOf);
  const problems: string[] = [];
  for (const [canvas, t] of tallies) {
    console.log(
      `  caption @${canvas}: ${String(t.framesHit)} of ${String(t.frames)} frames touch it — ` +
        `hand ${String(t.hand)}, stack ${String(t.stack)}, battlefield ${String(t.battlefield)}, piles ${String(t.piles)} of ${String(t.things)} things (a tenth of a box or more)`,
    );
    if (t.hand > 0) problems.push(`@${canvas}: the strip covers a card of a hand`);
    if (t.stack > 0) problems.push(`@${canvas}: the strip covers the stack`);
    if (t.piles > 0) problems.push(`@${canvas}: the strip covers a graveyard or exile pile`);
    const width = Number(canvas.split('x')[0]);
    // At 1280 px and wider it covers no battlefield card at all. At 1024 px the
    // right end of a full land rank reaches under any strip worth reading, and
    // the bound is only that it stays rare.
    if (width >= 1280 && t.battlefield > 0) problems.push(`@${canvas}: the strip covers ${String(t.battlefield)} battlefield cards`);
    if (width < 1280 && t.battlefield / t.things >= 0.01) problems.push(`@${canvas}: the strip covers ${String(t.battlefield)} battlefield cards`);
  }
  assert.deepEqual(problems, []);
  // Neither duelist is under it, from the table view, at any canvas.
  const looks = validateDuelists(duelistsJson).data;
  for (const seat of ['you', 'opp'] as const) {
    const id = looks.seats[seat];
    const samples = duelistSamples(seat, duelistHeight(id === undefined ? null : (looks.looks[id] ?? null)));
    for (const canvas of CANVASES) {
      const rect = captionRectOf(canvas.width);
      const under = samples.filter((q) => {
        const ndc = projectToNdc(VIEW_BY_ID.table.pose, q, CAMERA.fov, canvas.width / canvas.height);
        return ndc !== null && underRect(ndc, rect, canvas.width, canvas.height);
      });
      assert.equal(under.length, 0, `@${String(canvas.width)}: ${String(under.length)} of your${seat === 'opp' ? ' opponent’s' : ''} duelist's samples are under the strip`);
    }
  }
  // The negative control: the subtitle spot — the same box at the bottom centre —
  // is over your hand, which is why the strip is not there.
  const bottomCentre = (width: number): CornerRect => {
    const rect = captionRectOf(width);
    return { ...rect, corner: 'bottom-left', insetX: (width - rect.width) / 2, insetY: 8 };
  };
  for (const [canvas, t] of measure(bottomCentre)) {
    console.log(`  control (bottom centre) @${canvas}: hand ${String(t.hand)}, battlefield ${String(t.battlefield)} in ${String(t.framesHit)} of ${String(t.frames)} frames`);
    assert.ok(t.hand > t.frames / 2, `@${canvas}: the bottom centre covers a hand card in only ${String(t.hand)} of ${String(t.frames)} frames — the control has no teeth`);
  }
});

/**
 * **The strip in every view, re-measured** (the play-distance audit, 2026-09-29).
 * D256 measured the table view (held above) and the low view, and printed the
 * others once over the 20 logs of its day; the rebase onto the villain logs did
 * not measure them again. They are printed here on every run, over whatever the
 * corpus is, and two of D256's claims are held: the low view — seat-safe — covers
 * nothing from 1600 px, and no seat-safe view covers a pile. What the strip does
 * cover elsewhere is the caption's follow-up 2 (a place per view), whose owner
 * question the audit's pictures illustrate: the right end of your hand in the
 * shoulder view, and the stack in the low view below 1600 px.
 */
test('caption: the strip in every view, re-measured — the low view covers nothing from 1600 px, and no seat-safe view covers a pile', () => {
  for (const view of ['shoulder', 'low', 'oppShoulder', 'side'] as const) {
    for (const [canvas, t] of measure(captionRectOf, view)) {
      console.log(
        `  caption @${canvas}, ${view}: ${String(t.framesHit)} of ${String(t.frames)} frames touch it — ` +
          `hand ${String(t.hand)}, stack ${String(t.stack)}, battlefield ${String(t.battlefield)}, piles ${String(t.piles)}`,
      );
      const width = Number(canvas.split('x')[0]);
      if (view === 'low' && width >= 1600) assert.equal(t.framesHit, 0, `@${canvas}: the low view puts something under the strip`);
      if (view === 'shoulder' || view === 'low') assert.equal(t.piles, 0, `@${canvas}: the ${view} view puts a pile under the strip`);
    }
  }
});
