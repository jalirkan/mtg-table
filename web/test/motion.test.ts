/*
 * mtg-table — web/test/motion.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The comic motion lane** (`docs/research/15-art-direction.md` §5, §9.2; D130–D136
 * on branch `motion`): on twos as a pure function of a cue's own progress, the two
 * switches, and the A/B the cue strip promises — with *comic FX* off, the film over
 * the whole committed corpus is the film before the lane, op for op.
 *
 * Everything here runs under `node --test` with no browser: `cues/` imports no three.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  COMIC_FX_DEFAULT,
  DEFAULT_MOTION,
  ON_TWOS_DEFAULT,
  TWOS_FPS,
  TWOS_MIN_STEPS,
  TWOS_MS,
  motionFromSearch,
  onTwos,
} from '../src/arena/cues/motion.ts';
import { CueQueue } from '../src/arena/cues/queue.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import {
  BURSTS,
  COMIC_WORDS,
  INK_SHAPES,
  NullStage,
  burstWord,
  isBurst,
  isComicWord,
  type CueImpl,
  type CueRegistry,
} from '../src/arena/cues/stage.ts';
import { validateCues } from '../src/arena/cues/validate.ts';
import type { GameEvent } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const CUES = validateCues(
  JSON.parse(readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8')) as unknown,
  { cueIds: new Set(REGISTRY.keys()) },
).data;

function fixtureFiles(): string[] {
  const out: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) if (name.endsWith('.jsonl')) out.push(dir + name);
  }
  return out;
}

function framesOf(file: string): Array<{ state: ClientState; events: GameEvent[] }> {
  const log = parseFrameLog(readFileSync(FIXTURES + file, 'utf8'));
  const out: Array<{ state: ClientState; events: GameEvent[] }> = [];
  let state = initialState(log.header);
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type === 'state') out.push({ state, events: state.events });
  }
  return out;
}

// ---------------------------------------------------------------------------
// On twos, the pure function
// ---------------------------------------------------------------------------

test('motion: on twos is twelve drawings a second, and the ends are exact', () => {
  assert.equal(TWOS_FPS, 12);
  assert.ok(Math.abs(TWOS_MS - 1000 / 12) < 1e-9);
  // The last frame of a cue is its identity frame: never held a step short of it.
  for (const ms of [0, 40, 180, 650, 1600]) {
    assert.equal(onTwos(1, ms, TWOS_MS), 1, `ms ${String(ms)}: t = 1 is 1`);
    assert.equal(onTwos(1.3, ms, TWOS_MS), 1);
    assert.equal(onTwos(0, ms, TWOS_MS), 0);
    assert.equal(onTwos(-0.2, ms, TWOS_MS), 0);
  }
  // A degenerate step or length leaves the progress alone.
  assert.equal(onTwos(0.37, 600, 0), 0.37);
  assert.equal(onTwos(0.37, 0, TWOS_MS), 0.37);
});

test('motion: on twos never runs ahead, never goes back, and holds each drawing', () => {
  for (const ms of [60, 180, 250, 500, 850, 1400]) {
    const steps = Math.max(TWOS_MIN_STEPS, Math.round(ms / TWOS_MS));
    const seen = new Set<number>();
    let last = -1;
    for (let i = 0; i <= 2000; i++) {
      const t = i / 2000;
      const shown = onTwos(t, ms, TWOS_MS);
      assert.ok(shown <= t + 1e-12, `ms ${String(ms)}: ${String(shown)} ran ahead of ${String(t)}`);
      assert.ok(shown >= last, `ms ${String(ms)}: went back at t ${String(t)}`);
      assert.ok(t - shown < 1 / steps + 1e-9, `ms ${String(ms)}: held longer than one drawing`);
      last = shown;
      seen.add(shown);
    }
    // The drawings plus the exact last frame.
    assert.equal(seen.size, steps + 1, `ms ${String(ms)}: ${String(seen.size)} distinct drawings, expected ${String(steps + 1)}`);
  }
});

test('motion: a short cue is drawn in at least four steps — a compressed tap keeps its middle', () => {
  // 60 ms is a 180 ms tap under the 250 ms live budget: under one twelfth of a second.
  const values = new Set<number>();
  for (let i = 0; i < 100; i++) values.add(onTwos(i / 100, 60, TWOS_MS));
  assert.deepEqual([...values].sort(), [0, 0.25, 0.5, 0.75]);
  assert.equal(TWOS_MIN_STEPS, 4);
});

test('motion: the step is in SCREEN time — a 4× replay is still twelve drawings a second', () => {
  // A 1000 ms cue at 4× lasts 250 ms on screen: three drawings at 12 per second,
  // floored to the minimum of four.
  const fast = new Set<number>();
  const slow = new Set<number>();
  for (let i = 0; i < 1000; i++) {
    fast.add(onTwos(i / 1000, 1000, TWOS_MS * 4));
    slow.add(onTwos(i / 1000, 1000, TWOS_MS * 0.5));
  }
  assert.equal(fast.size, TWOS_MIN_STEPS);
  assert.equal(slow.size, Math.round(1000 / (TWOS_MS * 0.5)));
});

test('motion: the two switches, as the URL states them', () => {
  assert.deepEqual(DEFAULT_MOTION, { comic: COMIC_FX_DEFAULT, twos: ON_TWOS_DEFAULT });
  assert.equal(COMIC_FX_DEFAULT, true, 'comic FX is the lane’s deliverable: on by default');
  assert.equal(ON_TWOS_DEFAULT, true, 'on twos is on by default (the brief)');
  assert.deepEqual(motionFromSearch(''), DEFAULT_MOTION);
  assert.deepEqual(motionFromSearch('?fx=classic'), { comic: false, twos: true });
  assert.deepEqual(motionFromSearch('?fx=comic&twos=0'), { comic: true, twos: false });
  assert.deepEqual(motionFromSearch('?twos=1&replay=games/g1.jsonl'), { comic: true, twos: true });
  assert.deepEqual(motionFromSearch('?fx=loud&twos=maybe'), DEFAULT_MOTION, 'an unknown value is the default');
});

// ---------------------------------------------------------------------------
// On twos, in the queue
// ---------------------------------------------------------------------------

/** A registry with one cue that records the progress it is handed. */
function spyRegistry(seen: number[]): CueRegistry {
  const impl: CueImpl = {
    lane: 'card',
    apply(_ctx, t) {
      seen.push(t);
    },
    end() {},
  };
  return new Map([['spy', impl]]);
}

const SPY_DATA = { version: 1, cards: {}, archetypes: {}, defaults: { tap: { cue: 'spy', ms: 1000 } } };
const TAP: GameEvent[] = [{ kind: 'tap', cardId: 7, tapped: true }];

function spyRun(options: { onTwos?: boolean; reducedMotion?: boolean }): { seen: number[]; queue: CueQueue } {
  const seen: number[] = [];
  const queue = new CueQueue({ stage: new NullStage(), registry: spyRegistry(seen), data: SPY_DATA, mode: 'replay', ...options });
  queue.enqueueBatch(TAP, initialState());
  for (let now = 0; now <= 1400; now += 10) queue.tick(now);
  return { seen, queue };
}

test('motion: the queue hands each cue its progress on twos — and ends it on time', () => {
  const on = spyRun({ onTwos: true });
  const off = spyRun({ onTwos: false });
  // Smooth: a new value nearly every tick. On twos: twelve drawings in a second.
  assert.ok(new Set(off.seen).size > 60, `smooth progress saw ${String(new Set(off.seen).size)} values`);
  assert.equal(new Set(on.seen).size, 12 + 1, 'twelve drawings and the exact last frame');
  assert.equal(on.seen[on.seen.length - 1], 1);
  // Stepping never holds a cue past its length: both drained on the same tick.
  assert.ok(on.queue.idle && off.queue.idle);
  assert.equal(on.seen.length, off.seen.length, 'on twos changed how long the cue ran');
});

test('motion: reduced motion turns on twos off, whatever the setting', () => {
  const reduced = spyRun({ onTwos: true, reducedMotion: true });
  assert.ok(new Set(reduced.seen).size > 20, 'a reduced-motion cue was stepped');
  const queue = new CueQueue({ stage: new NullStage(), registry: REGISTRY, data: CUES, reducedMotion: true, onTwos: true });
  assert.equal(queue.onTwos, true, 'the setting is kept');
  assert.equal(queue.twosActive, false, 'but it is not played');
  queue.setReducedMotion(false);
  assert.equal(queue.twosActive, true);
  queue.setOnTwos(false);
  assert.equal(queue.twosActive, false);
});

test('motion: the comic setting is stamped into each cue at enqueue, as reduced motion is', () => {
  const contexts: Array<boolean | undefined> = [];
  const registry: CueRegistry = new Map([
    ['spy', { lane: 'card', apply(ctx) { contexts.push(ctx.comic); }, end() {} } satisfies CueImpl],
  ]);
  const queue = new CueQueue({ stage: new NullStage(), registry, data: SPY_DATA, comic: false });
  queue.enqueueBatch(TAP, initialState());
  queue.advance(10);
  queue.setComic(true);
  queue.advance(10);
  queue.flushAndSnap();
  queue.enqueueBatch(TAP, initialState());
  queue.advance(10);
  assert.deepEqual([...new Set(contexts)], [false, true], 'a running cue kept its own; the next batch took the new one');
  assert.equal(new CueQueue({ stage: new NullStage(), registry }).comic, COMIC_FX_DEFAULT);
});

// ---------------------------------------------------------------------------
// The closed vocabulary
// ---------------------------------------------------------------------------

test('motion: the onomatopoeia is a closed list, and a burst names one of it or nothing', () => {
  assert.deepEqual([...COMIC_WORDS], ['POW', 'BLAM', 'KRAK', 'ZZAK', 'WHOOSH']);
  for (const burst of BURSTS) {
    assert.ok(isBurst(burst));
    const word = burstWord(burst);
    if (burst === 'none' || burst === 'star') assert.equal(word, null);
    else assert.ok(word !== null && isComicWord(word), `${burst} → ${String(word)}`);
  }
  for (const bad of ['POW', 'bam', '', 'pow!', 'Nick Fury', 3, null]) assert.equal(isBurst(bad), false, String(bad));
  assert.equal(isComicWord('pow'), false, 'the lettering is upper case; the param is lower');
  assert.deepEqual([...INK_SHAPES].sort(), ['burst', 'dots', 'splat']);
});

// ---------------------------------------------------------------------------
// The A/B: comic FX off is the film before the lane, over the whole corpus
// ---------------------------------------------------------------------------

/** One recording through the real queue; every op the stage saw, as comparable text. */
function opLog(file: string, comic: boolean): { ops: string[]; comicOps: number; materialized: number; streaks: number; words: Set<string>; shakes: number } {
  const stage = new NullStage();
  let shakes = 0;
  const original = stage.requestCamera.bind(stage);
  stage.requestCamera = (request) => {
    if (request !== null && request.frame.length === 0) shakes += 1;
    original(request);
  };
  // On twos off in BOTH runs: the A/B is about the vocabulary, and stepping is its
  // own switch with its own tests above.
  const queue = new CueQueue({ stage, registry: REGISTRY, data: CUES, mode: 'replay', comic, onTwos: false });
  let previous: ClientState['board'] = null;
  let now = 0;
  for (const { state, events } of framesOf(file)) {
    queue.enqueueBatch(events, state, undefined, previous);
    previous = state.board;
    let guard = 0;
    while (!queue.idle && guard++ < 400) {
      now += 25;
      queue.tick(now);
    }
  }
  let comicOps = 0;
  let materialized = 0;
  let streaks = 0;
  const words = new Set<string>();
  const ops = stage.ops.map((op) => {
    if (op.effect !== undefined && (op.effect.kind === 'streak' || (op.effect.shape !== undefined && INK_SHAPES.has(op.effect.shape)) || op.effect.word !== undefined)) comicOps += 1;
    if (op.effect?.kind === 'streak') streaks += 1;
    if (op.effect?.word !== undefined) words.add(op.effect.word);
    if (op.offset !== undefined && op.offset.materialize !== 1) materialized += 1;
    return JSON.stringify(op);
  });
  return { ops, comicOps, materialized, streaks, words, shakes };
}

test('motion: with comic FX off, every recording plays the film it played before the lane', () => {
  let files = 0;
  let classicOps = 0;
  for (const file of fixtureFiles()) {
    const classic = opLog(file, false);
    files += 1;
    classicOps += classic.ops.length;
    assert.equal(classic.comicOps, 0, `${file}: a comic effect was drawn with comic FX off`);
    assert.equal(classic.materialized, 0, `${file}: a figure materialised with comic FX off`);
    assert.equal(classic.shakes, 0, `${file}: an impact shake with comic FX off`);
  }
  assert.ok(files >= 18 && classicOps > 10000, `${String(files)} files, ${String(classicOps)} ops`);
});

test('motion: with comic FX on, the corpus plays the new vocabulary — and it all decays', () => {
  const words = new Set<string>();
  let comicOps = 0;
  let materialized = 0;
  let streaks = 0;
  let shakes = 0;
  for (const file of fixtureFiles()) {
    const comic = opLog(file, true);
    comicOps += comic.comicOps;
    materialized += comic.materialized;
    streaks += comic.streaks;
    shakes += comic.shakes;
    for (const word of comic.words) words.add(word);
  }
  console.log(
    `  comic FX over the corpus: ${String(comicOps)} ink/streak/lettered effect ops · ${String(streaks)} streak ops · ` +
      `${String(materialized)} materialise offsets · ${String(shakes)} impact-shake requests · words ${[...words].sort().join(', ')}`,
  );
  assert.ok(comicOps > 0 && streaks > 0 && materialized > 0 && shakes > 0);
  for (const word of words) assert.ok(isComicWord(word), `${word} is not on the closed list`);
  // POW is every lethal blow's default; the per-card words need their cards on the table.
  assert.ok(words.has('POW'), 'no POW in a whole corpus of lethal damage');
});
