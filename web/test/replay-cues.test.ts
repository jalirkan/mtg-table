/*
 * mtg-table — web/test/replay-cues.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The fixture sweep — the important one** (report 09 §10.3).
 *
 * Every line of every committed recording goes through the **real** `reduce()`;
 * every `state` frame's `events` go through the **real** cue queue, driven by an
 * injected clock against a `NullStage` that records ops instead of touching
 * WebGL. Six assertions, and each one is a property the arena's design claims:
 *
 *  1. **No throw, anywhere, ever.** PLAN's M7 brief asks for exactly this.
 *  2. **Coverage.** Every event kind a fixture actually emitted resolves to a
 *     real cue. The allowlist is one entry — `phase`, which §6 gives zero
 *     duration and the planner drops before the timeline.
 *  3. **Decay.** After each batch drains, the queue is empty *and the offset map
 *     is empty*. That is the mechanical proof of §5.1 — cues return the scene to
 *     `layout(state)` — and it is what makes skip, scrub and flush correct.
 *  4. **Resolution.** Every card id a cue targets either resolves against that
 *     same frame or is a card the viewer may not see (§3.6 rule 1). There is no
 *     third outcome.
 *  5. **Budget.** With `awaitingHuman()` forced true, the whole remaining queue
 *     fits in 250 ms (§5.3).
 *  6. **Redaction, again.** No cue parameter and no stage op carries a card
 *     name. The arena is a new consumer of the same data and the first surface
 *     that draws per-card text into a texture, so it gets its own net.
 *
 * All of it under `node --test`, with no browser: `arena/cues/` imports no
 * three, which is what report 09 §2.4's `[NO three]` annotations bought.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { cursorOf, intakeFor, JUMP_FRAMES } from '../src/arena/cues/intake.ts';
import {
  BUDGET_MS,
  CueQueue,
  MAX_PENDING_STEPS,
  MAX_TICK_MS,
  REDUCED_MOTION_SCALE,
  awaitingHuman,
  compressionFor,
  naturalMs,
  planBatch,
} from '../src/arena/cues/queue.ts';
import { archetypeKey } from '../src/arena/cues/archetype.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { cuesFor, resolve, selectorsFor, subjectOf } from '../src/arena/cues/resolve.ts';
import { NullStage, type CueRegistry } from '../src/arena/cues/stage.ts';
import { EMPTY_CUE_DATA, NO_OP, type Cue } from '../src/arena/cues/types.ts';
import { validateCues } from '../src/arena/cues/validate.ts';
import { layout } from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type GameEvent } from '../src/protocol.ts';
import { findCard } from '../src/render/resolve.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const CUES = (() => {
  const raw = JSON.parse(
    readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8'),
  ) as unknown;
  return validateCues(raw, { cueIds: new Set(REGISTRY.keys()) }).data;
})();

/**
 * §10.3 — the ONLY kind allowed to animate nothing. `GameEventTurnPhase` fires
 * on every step (4,049 of them in the corpus); §6 gives it zero duration and
 * the planner drops it before it can reach the timeline.
 */
const EXPECTED_NO_OP = new Set(['phase']);

/** A virtual frame, in ms. 25 ms is 40 fps — fast enough to see the middle of a cue. */
const FRAME_MS = 25;
/** Nothing in the table is longer than 1600 ms; 8 s is a generous drain. */
const MAX_DRAIN_MS = 8000;

interface FixtureFrame {
  state: ClientState;
  events: GameEvent[];
}

function fixtureFiles(): string[] {
  const out: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (name.endsWith('.jsonl')) out.push(dir + name);
    }
  }
  return out;
}

function framesOf(file: string): FixtureFrame[] {
  const log = parseFrameLog(readFileSync(FIXTURES + file, 'utf8'));
  const out: FixtureFrame[] = [];
  let state = initialState(log.header);
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type === 'state') out.push({ state, events: state.events });
  }
  return out;
}

/** Every card name this recording ever showed in the clear — the redaction net. */
function namesIn(frames: FixtureFrame[]): Set<string> {
  const names = new Set<string>();
  const add = (card: AnyCard): void => {
    if (isHidden(card)) return;
    const name = (card as { name?: string }).name;
    // Short names would collide with ordinary words; the deck's are all longer.
    if (typeof name === 'string' && name.length >= 4) names.add(name.toLowerCase());
  };
  for (const { state } of frames) {
    const board = state.board;
    if (board === null) continue;
    for (const card of board.stackCards) add(card);
    for (const player of board.players) {
      for (const zone of [
        player.zones.hand,
        player.zones.battlefield,
        player.zones.graveyard,
        player.zones.exile,
        player.zones.command,
        player.zones.library,
      ]) {
        for (const card of zone.cards) add(card);
      }
    }
  }
  return names;
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

test('replay-cues: every event of every committed recording plays without throwing', () => {
  const files = fixtureFiles();
  assert.ok(files.length >= 18, `expected the committed corpus, saw ${String(files.length)} files`);

  /** kind → { emitted, cued, cues } */
  const coverage = new Map<string, { emitted: number; cued: number; cues: Set<string> }>();
  let batches = 0;
  let framesSeen = 0;
  let targetsResolved = 0;
  let targetsHidden = 0;
  let effectsRefused = 0;
  const notes = new Set<string>();

  for (const file of files) {
    const frames = framesOf(file);
    const names = namesIn(frames);
    const stage = new NullStage();
    const queue = new CueQueue({
      stage,
      registry: REGISTRY,
      data: CUES,
      mode: 'replay',
      onNote: (message) => notes.add(`${file}: ${message}`),
    });
    let now = 0;
    // T6: the planner is handed the board of the frame before, exactly as
    // `Arena.tsx`'s intake does, so the strike's aim (`strikeParams`) is part of
    // the sweep — its clip on the struck figure must decay like every other.
    let previous: ClientState['board'] = null;

    for (const { state, events } of frames) {
      framesSeen += 1;

      // -- coverage, from the ladder itself so `phase` has a row too ---------
      for (const event of events) {
        const row = coverage.get(event.kind) ?? { emitted: 0, cued: 0, cues: new Set<string>() };
        row.emitted += 1;
        const cues = cuesFor(event, state, CUES, previous);
        if (cues.length > 0) row.cued += 1;
        for (const cue of cues) row.cues.add(cue.id);
        coverage.set(event.kind, row);

        // -- redaction (§10.3's last assertion) ------------------------------
        for (const cue of cues) assertNoNames(cue, names, file);
      }

      // -- the queue ---------------------------------------------------------
      if (events.length > 0) batches += 1;
      queue.enqueueBatch(events, state, undefined, previous);
      previous = state.board;
      assert.ok(
        queue.pendingSteps <= MAX_PENDING_STEPS,
        `${file}: ${String(queue.pendingSteps)} pending steps — the §5.2 cap did not hold`,
      );

      // -- resolution (§3.6 rule 1) -----------------------------------------
      for (const event of events) {
        for (const cue of cuesFor(event, state, CUES)) {
          for (const id of cue.targets) {
            assert.ok(
              Number.isInteger(id) && id >= 0,
              `${file}: cue ${cue.id} targets a non-id ${String(id)}`,
            );
            const board = state.board;
            if (board !== null && findCard(board, id) !== undefined) targetsResolved += 1;
            else targetsHidden += 1;
          }
        }
      }

      // -- drain, and assert the scene is back at layout(state) --------------
      let elapsed = 0;
      while (!queue.idle && elapsed < MAX_DRAIN_MS) {
        now += FRAME_MS;
        elapsed += FRAME_MS;
        queue.tick(now);
      }
      assert.ok(queue.idle, `${file}: a batch did not drain within ${String(MAX_DRAIN_MS)} ms`);
      assert.equal(queue.length, 0, `${file}: cues left in the queue after draining`);
      assert.equal(
        stage.offsets.size,
        0,
        `${file}: ${String(stage.offsets.size)} offsets survived the batch — §5.1's decay is broken`,
      );
      assert.equal(stage.effects.size, 0, `${file}: ${String(stage.effects.size)} effects survived`);
      /**
       * **T3's one line, and it is the whole proof that the clip lane was built
       * on the right side of §1.1** (report 13 §1.1, §10.2).
       *
       * A clip is a *pose*, and a pose that survived its cue is a figure frozen
       * mid-lunge — the exact failure `skip all`, a backwards scrub and a
       * `resync` would all produce if the lane remembered anything. `cue()`
       * clears every target's clip in `end()`, whether the cue set one or not,
       * and this is the assertion that says so over all 3,293 batches.
       */
      assert.equal(
        stage.clips.size,
        0,
        `${file}: ${String(stage.clips.size)} clips survived the batch — the clip lane does not decay`,
      );
    }

    for (const op of stage.strings()) {
      assertStringIsClean(op, names, file);
    }
    effectsRefused += stage.refusedEffects;
  }

  // -- the coverage table, printed every run --------------------------------
  const rows = [...coverage.entries()].sort((a, b) => b[1].emitted - a[1].emitted);
  console.log('  kind          emitted   cued  cues');
  for (const [kind, row] of rows) {
    console.log(
      `  ${kind.padEnd(12)} ${String(row.emitted).padStart(7)} ${String(row.cued).padStart(6)}  ${[...row.cues].sort().join(', ')}`,
    );
  }
  console.log(
    `  ${String(framesSeen)} state frames · ${String(batches)} non-empty batches · ` +
      `targets ${String(targetsResolved)} resolved / ${String(targetsHidden)} unresolvable (hidden) · ` +
      `${String(effectsRefused)} effects over the §9.3 cap`,
  );
  for (const note of notes) console.log(`  note — ${note}`);

  // §10.3's headline: every kind that fired resolved to a real cue.
  for (const [kind, row] of coverage) {
    if (EXPECTED_NO_OP.has(kind)) continue;
    assert.ok(row.cued > 0, `kind "${kind}" fired ${String(row.emitted)} times and never produced a cue`);
    assert.ok(!row.cues.has(NO_OP), `kind "${kind}" resolved to ${NO_OP}`);
  }
  assert.ok(coverage.size >= 20, `expected the corpus' 21 kinds, saw ${String(coverage.size)}`);
  assert.ok(framesSeen > 3000, `expected the whole corpus, saw ${String(framesSeen)} state frames`);
});

test('replay-cues: with the engine waiting on the human, the queue fits in 250 ms', () => {
  // §5.3 as an executable assertion. `outcome.finish` is the one documented
  // exemption (§6: the game is over, so nothing is waiting on anyone).
  let checked = 0;
  let worst = 0;
  for (const file of fixtureFiles()) {
    for (const { state, events } of framesOf(file)) {
      if (events.length === 0) continue;
      if (events.some((event) => event.kind === 'outcome')) continue;
      const stage = new NullStage();
      const queue = new CueQueue({ stage, registry: REGISTRY, data: CUES, mode: 'live' });
      queue.enqueueBatch(events, state, BUDGET_MS.awaitingHuman);
      const remaining = queue.totalRemainingMs();
      worst = Math.max(worst, remaining);
      assert.ok(
        remaining <= BUDGET_MS.awaitingHuman + 0.5,
        `${file}: a batch needs ${String(Math.round(remaining))} ms while the engine waits on the human`,
      );
      checked += 1;
    }
  }
  console.log(`  ${String(checked)} batches, worst ${String(Math.round(worst))} ms of ${String(BUDGET_MS.awaitingHuman)}`);
  assert.ok(checked > 1000);
});

test('replay-cues: awaitingHuman reads §4.2 the way the protocol means it', () => {
  const base = initialState();
  assert.equal(awaitingHuman(base), false);

  const input = (over: Record<string, unknown>): ClientState =>
    ({
      ...base,
      input: {
        prompt: '',
        focusCardId: null,
        focusCard: null,
        buttons: { ok: { label: 'OK', enabled: false }, cancel: { label: 'Cancel', enabled: false } },
        selectable: { cardIds: [], min: 0, max: 0, mode: 'any' },
        highlighted: [],
        weak: [],
        openZones: [],
        ...over,
      },
    }) as unknown as ClientState;

  assert.equal(awaitingHuman(input({})), false, 'both buttons disabled and nothing selectable is idle');
  // §4.2's invariant: a disabled OK with a non-empty selectable list means the
  // engine wants a CARD CLICK — the state where a two-second cue feels like a
  // hang, and the one a buttons-only predicate would miss.
  assert.equal(
    awaitingHuman(input({ selectable: { cardIds: [12], min: 1, max: 1, mode: 'any' } })),
    true,
  );
  assert.equal(
    awaitingHuman(input({ buttons: { ok: { label: 'OK', enabled: true }, cancel: { label: 'x', enabled: false } } })),
    true,
  );
  assert.equal(
    awaitingHuman({ ...base, ask: { askId: 'a1', kind: 'confirm' } } as unknown as ClientState),
    true,
    'a blocking ask is the clearest case of all',
  );
});

// ---------------------------------------------------------------------------
// The queue's own rules (§5.2)
// ---------------------------------------------------------------------------

test('queue: consecutive same-kind events coalesce into one staggered step', () => {
  // §5.2's worked example: eight taps from one mana ability are ONE step of
  // eight cues, not eight serialised 180 ms cues.
  const state = initialState();
  const taps: GameEvent[] = Array.from({ length: 8 }, (_, i) => ({
    kind: 'tap',
    cardId: i + 1,
    tapped: true,
  }));
  const steps = planBatch(taps, state, EMPTY_CUE_DATA);
  assert.equal(steps.length, 1, 'eight taps are one step');
  assert.equal(steps[0]?.cues.length, 8);
  assert.ok(steps[0]!.staggerMs <= 40 && steps[0]!.staggerMs > 0);
  assert.ok(steps[0]!.ms <= 180 + 240, 'the stagger tail is capped at 240 ms');
  assert.ok(naturalMs(steps) < 8 * 180, 'and it is far shorter than the serialised form');
});

test('queue: a cast swallows the zone event that follows it', () => {
  // §6 — Forge emits both for every spell cast; without the rule the card flies
  // to the stack and then flies to the stack again.
  const state = initialState();
  const events: GameEvent[] = [
    { kind: 'cast', stackId: 9, cardId: 41, controller: 0, text: '' },
    { kind: 'zone', cardId: 41, from: { zone: 'hand', player: 0 }, to: { zone: 'stack', player: null } },
  ];
  const steps = planBatch(events, state, EMPTY_CUE_DATA);
  const ids = steps.flatMap((s) => s.cues.map((c) => c.id));
  assert.deepEqual(ids, ['cast.rise']);
});

test('queue: a resolved spell does not also shatter', () => {
  const state = initialState();
  const events: GameEvent[] = [
    { kind: 'resolved', cardId: 41, fizzled: false },
    { kind: 'unstacked', cardId: 41 },
  ];
  const ids = planBatch(events, state, EMPTY_CUE_DATA).flatMap((s) => s.cues.map((c) => c.id));
  assert.deepEqual(ids, ['resolved.pop']);
});

test('queue: stats gives up any card another cue already owns', () => {
  const state = initialState();
  const events: GameEvent[] = [
    { kind: 'stats', cardIds: [1, 2, 3], transform: false },
    { kind: 'tap', cardId: 2, tapped: true },
  ];
  const steps = planBatch(events, state, EMPTY_CUE_DATA);
  const stats = steps.flatMap((s) => s.cues).find((c) => c.id === 'stats.flash');
  assert.deepEqual(stats?.targets, [1, 3]);
  // …and a stats event with nothing left drops entirely.
  const only: GameEvent[] = [
    { kind: 'stats', cardIds: [2], transform: false },
    { kind: 'tap', cardId: 2, tapped: true },
  ];
  const ids = planBatch(only, state, EMPTY_CUE_DATA).flatMap((s) => s.cues.map((c) => c.id));
  assert.deepEqual(ids, ['tap.rotate']);
});

test('queue: phase events never reach the timeline', () => {
  const state = initialState();
  const events: GameEvent[] = [
    { kind: 'phase', player: 0, phase: 'MAIN1' },
    { kind: 'phase', player: 0, phase: 'COMBAT_BEGIN' },
  ];
  assert.deepEqual(planBatch(events, state, EMPTY_CUE_DATA), []);
});

test('queue: time compression scales, then snaps below the floor', () => {
  const state = initialState();
  const events: GameEvent[] = Array.from({ length: 6 }, (_, i) => ({
    kind: 'cast',
    stackId: i,
    cardId: i + 1,
    controller: 0,
    text: '',
  }));
  const steps = planBatch(events, state, EMPTY_CUE_DATA);
  const natural = naturalMs(steps);
  assert.ok(natural > 250, `six casts are ${String(natural)} ms naturally`);
  assert.equal(compressionFor(steps, natural * 2), 1, 'a batch inside its budget is not compressed');
  const squeezed = compressionFor(steps, natural / 2);
  assert.ok(squeezed > 0.49 && squeezed < 0.51);
  assert.equal(compressionFor(steps, natural / 100), 0, 'below 0.25× the cues snap instead');
});

/**
 * **§8 rule 7, as written** (verification fix): `prefers-reduced-motion: reduce`
 * *"disables shake entirely and scales all cue durations to 30%"*.
 *
 * The arena first took the harder reading and collapsed every cue to a snap —
 * measured as the same four stepped frames queueing 12 steps / 3050 ms normally
 * and **0 steps / 0 ms** with reduced motion on. Several cues are the only
 * channel for a fact (the damage number, the counter pip), so that removed
 * information rather than slowing the film down, and it silently contradicted
 * the paragraph the code cited. Durations now scale; shake and camera moves
 * stay hard off, which is the other half of the same rule.
 */
test('queue: reduced motion plays at 30%, and does not delete the cue', () => {
  const state = initialState();
  const events: GameEvent[] = Array.from({ length: 6 }, (_, i) => ({
    kind: 'cast',
    stackId: i,
    cardId: i + 1,
    controller: 0,
    text: '',
  }));
  const steps = planBatch(events, state, EMPTY_CUE_DATA);
  const natural = naturalMs(steps);

  const reduced = compressionFor(steps, natural * 2, true);
  assert.ok(
    Math.abs(reduced - REDUCED_MOTION_SCALE) < 1e-9,
    `a batch inside its budget plays at ${String(REDUCED_MOTION_SCALE)}×, saw ${String(reduced)}`,
  );
  // Both factors compose: over budget AND reduced motion is 0.5 × 0.3.
  const both = compressionFor(steps, natural / 2, true);
  assert.ok(Math.abs(both - 0.5 * REDUCED_MOTION_SCALE) < 1e-9, `saw ${String(both)}`);
  // …and a batch already below the snap floor stays snapped.
  assert.equal(compressionFor(steps, natural / 100, true), 0);

  // The behavioural half: the queue really schedules something, and it really
  // is about a third as long.
  const play = (reducedMotion: boolean): number => {
    const queue = new CueQueue({
      stage: new NullStage(),
      registry: REGISTRY,
      data: EMPTY_CUE_DATA,
      mode: 'replay',
      reducedMotion,
    });
    queue.enqueueBatch(events, state);
    queue.tick(0);
    return queue.totalRemainingMs();
  };
  const full = play(false);
  const dim = play(true);
  assert.ok(full > 0, 'the control case queues something');
  assert.ok(dim > 0, 'reduced motion still plays the cue — it does not delete it');
  assert.ok(
    Math.abs(dim / full - REDUCED_MOTION_SCALE) < 0.05,
    `reduced motion ran ${(dim / full).toFixed(3)}× the full length (${String(dim)} of ${String(full)} ms)`,
  );
});

test('queue: skip, step and flush all land on layout(state)', () => {
  const state = initialState();
  const stage = new NullStage();
  const queue = new CueQueue({ stage, registry: REGISTRY, data: EMPTY_CUE_DATA, mode: 'replay' });
  const events: GameEvent[] = [
    { kind: 'cast', stackId: 1, cardId: 10, controller: 0, text: '' },
    { kind: 'life', player: 0, from: 20, to: 17 },
  ];

  queue.enqueueBatch(events, state);
  assert.ok(queue.pendingSteps >= 2);
  queue.tick(0);
  queue.tick(100);
  assert.ok(stage.offsets.size > 0, 'a cue in flight really does move something');

  queue.skipCurrent();
  assert.ok(queue.pendingSteps <= 1);
  queue.skipAll();
  assert.equal(queue.idle, true);
  assert.equal(stage.offsets.size, 0);
  assert.equal(stage.effects.size, 0);

  // …and a flush with nothing running is a no-op, not a throw.
  queue.flushAndSnap();
  assert.equal(queue.idle, true);
});

test('queue: pause stops the clock and speed multiplies it', () => {
  const state = initialState();
  const stage = new NullStage();
  const queue = new CueQueue({ stage, registry: REGISTRY, data: EMPTY_CUE_DATA, mode: 'replay' });
  queue.enqueueBatch([{ kind: 'tap', cardId: 1, tapped: true }], state);
  queue.tick(0);
  queue.setPaused(true);
  queue.tick(1000);
  assert.equal(queue.idle, false, 'a paused queue does not advance');
  queue.setPaused(false);
  queue.setSpeed(4);
  queue.tick(1100);
  assert.equal(queue.idle, true, 'and 100 ms at 4× is 400 ms of cue');
});

/**
 * **A batch that lands on an idle queue starts at its own `t = 0`** (the slice-2
 * verification pass's major finding, a Tier 1 defect).
 *
 * `frameloop="demand"` parks the loop whenever the queue drains, so the arena's
 * next tick can arrive seconds after its last one. `tick()` used to add that whole
 * gap to the cue clock, and the first frame of the next batch then jumped past
 * its start: stepping `human-auto-7` 794→795 after a 3 s pause drew its two dying
 * bodies on 0 frames. The spy registry below records the progress every cue is
 * applied at, which is exactly what the renderer would draw.
 */
test('queue: an idle gap is not film — the next batch starts at t = 0', () => {
  const state = initialState();
  const applied: Array<{ id: string; t: number }> = [];
  const spy: CueRegistry = new Map(
    [...REGISTRY].map(([id, impl]) => [
      id,
      {
        lane: impl.lane,
        apply: (ctx, t, stage) => {
          applied.push({ id: ctx.id, t });
          impl.apply(ctx, t, stage);
        },
        end: (ctx, stage) => impl.end(ctx, stage),
      },
    ]),
  );
  const queue = new CueQueue({ stage: new NullStage(), registry: spy, data: EMPTY_CUE_DATA, mode: 'replay' });

  // One batch played through to idle, at 60 fps.
  let now = 1000;
  queue.enqueueBatch([{ kind: 'tap', cardId: 1, tapped: true }], state);
  for (let i = 0; i < 200 && !queue.idle; i++) queue.tick((now += 16));
  assert.equal(queue.idle, true, 'the first batch drained');

  // The loop is parked: 3 s pass with no tick at all. Then a batch arrives and
  // the next frame is drawn.
  now += 3000;
  applied.length = 0;
  queue.enqueueBatch(
    [
      { kind: 'damage', target: { kind: 'card', id: 2 }, sourceCardId: 3, amount: 3, combat: true, damageType: null },
      { kind: 'tap', cardId: 4, tapped: true },
    ],
    state,
  );
  assert.equal(queue.idle, false, 'the batch queued something');
  queue.tick(now);
  assert.ok(applied.length > 0, 'the first frame after the gap drew the batch');
  const first = applied[0]!;
  assert.ok(first.t < 0.1, `the first cue opened at t = ${first.t.toFixed(3)} — the idle gap was played as film`);
  assert.equal(queue.idle, false, 'one frame did not consume the whole batch');

  // The same with an idle tick in between (a frame the loop drew for something
  // else — a texture, a camera move — while the queue had nothing to play).
  for (let i = 0; i < 400 && !queue.idle; i++) queue.tick((now += 16));
  assert.equal(queue.idle, true);
  queue.tick((now += 16));
  now += 3000;
  applied.length = 0;
  queue.enqueueBatch([{ kind: 'tap', cardId: 5, tapped: true }], state);
  queue.tick(now);
  assert.ok(applied.length > 0 && applied[0]!.t < 0.1, `after an idle tick: t = ${String(applied[0]?.t)}`);
});

test('queue: a late frame while cues run adds at most MAX_TICK_MS of film', () => {
  const state = initialState();
  const queue = new CueQueue({ stage: new NullStage(), registry: REGISTRY, data: EMPTY_CUE_DATA, mode: 'replay' });
  queue.enqueueBatch(
    [
      { kind: 'tap', cardId: 1, tapped: true },
      { kind: 'life', player: 0, from: 20, to: 17 },
    ],
    state,
  );
  queue.tick(0);
  const before = queue.totalRemainingMs();
  // A hidden tab, or a loop parked mid-cue: 5 s between two frames.
  queue.tick(5000);
  assert.equal(queue.idle, false, 'the batch was not swallowed by one late frame');
  assert.ok(
    Math.abs(before - queue.totalRemainingMs() - MAX_TICK_MS) < 1e-6,
    `one late frame advanced the film ${String(before - queue.totalRemainingMs())} ms`,
  );
});

test('queue: the 24-step cap flushes rather than queueing a cutscene', () => {
  const state = initialState();
  const stage = new NullStage();
  const notes: string[] = [];
  const queue = new CueQueue({
    stage,
    registry: REGISTRY,
    data: EMPTY_CUE_DATA,
    mode: 'replay',
    onNote: (m) => notes.push(m),
  });
  // Alternating kinds, so nothing coalesces: 40 steps in one batch.
  const events: GameEvent[] = [];
  for (let i = 0; i < 20; i++) {
    events.push({ kind: 'tap', cardId: i + 1, tapped: true });
    events.push({ kind: 'sacrificed', cardId: i + 100 });
  }
  queue.enqueueBatch(events, state);
  assert.equal(queue.idle, true, 'the cap flushed');
  assert.equal(stage.offsets.size, 0);
  assert.ok(notes.some((n) => n.includes('pending steps')), notes.join('\n'));
});

// ---------------------------------------------------------------------------
// §2.3 — batch intake
// ---------------------------------------------------------------------------

test('intake: a jump flushes, a step enqueues, a re-delivery does nothing', () => {
  const at = (eventSeq: number, framesApplied: number, gameId: string | null = 'g1') => ({
    eventSeq,
    framesApplied,
    gameId,
  });
  assert.equal(intakeFor(at(10, 100), at(12, 101)), 'enqueue', 'the next batch');
  assert.equal(intakeFor(at(10, 100), at(10, 101)), 'nothing', 'a re-delivered or non-state frame');
  assert.equal(intakeFor(at(10, 100), at(4, 40)), 'flush', 'a backwards scrub');
  assert.equal(intakeFor(at(10, 100), at(900, 100 + JUMP_FRAMES + 1)), 'flush', 'a forward scrub');
  assert.equal(intakeFor(at(10, 100, 'g1'), at(11, 101, 'g2')), 'flush', 'a new game is a reset');
  // A resync re-delivers verbatim — same seq, same everything (amendment M10).
  assert.equal(intakeFor(at(10, 100), at(10, 100)), 'nothing');
});

test('intake: a real recording steps one frame at a time', () => {
  // The rule has to hold over an actual stream, not just over hand-built
  // cursors: if ordinary playback ever looked like a jump, the arena would snap
  // through the whole game and animate nothing.
  const log = parseFrameLog(readFileSync(`${FIXTURES}games/g1.jsonl`, 'utf8'));
  let state = initialState(log.header);
  let previous = cursorOf(state);
  const counts = { nothing: 0, enqueue: 0, flush: 0 };
  let stateFrames = 0;
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type === 'state') stateFrames += 1;
    const next = cursorOf(state);
    counts[intakeFor(previous, next)] += 1;
    previous = next;
  }
  console.log(`  g1.jsonl intake: ${JSON.stringify(counts)} over ${String(stateFrames)} state frames`);
  assert.equal(counts.flush, 1, 'exactly one flush — the first hello_ok, which is a reset');
  // Every single `state` frame enqueues: ordinary playback must never look like
  // a jump, or the arena would snap through the game and animate nothing.
  assert.equal(counts.enqueue, stateFrames);
  assert.ok(stateFrames > 300, `expected a whole game, saw ${String(stateFrames)} state frames`);
});

test('queue: a permanent cast and resolved in ONE snapshot animates once', () => {
  // Suppression rules 5 and 6, on the frame that produced them. A `state` can
  // cover several engine steps: at frame 175 of g1 the Helicarrier is cast,
  // resolves and enters, and Forge reports `resolved` for it twice.
  let batches = 0;
  let suppressed = 0;
  for (const file of fixtureFiles()) {
    for (const { state, events } of framesOf(file)) {
      const cast = new Set<number>();
      for (const event of events) if (event.kind === 'cast') cast.add(event.cardId);
      const entering = events.some(
        (e) => e.kind === 'zone' && e.to?.zone === 'battlefield' && cast.has(e.cardId),
      );
      if (!entering) continue;
      batches += 1;

      // **Per batch**, because that is the scope §5.1 composes in: two cues
      // alive in the same frame add their translations, and two batches apart
      // is just the game happening twice.
      const byCard = new Map<number, string[]>();
      for (const step of planBatch(events, state, CUES)) {
        for (const cue of step.cues) {
          for (const id of cue.targets) byCard.set(id, [...(byCard.get(id) ?? []), cue.id]);
        }
      }
      for (const [id, ids] of byCard) {
        const arrives = ids.some(
          (c) => c === 'zone.enters' || c === 'fx.flyIn' || c === 'land.rise' || c === 'fx.terrain',
        );
        // Rule 5: nothing both rises out of a hand and arrives on the table.
        assert.ok(
          !(arrives && ids.includes('cast.rise')),
          `${file}: card ${String(id)} plays ${ids.join(' + ')} — it rises out of the hand it has already left`,
        );
        // Rule 6: no exact duplicate inside one batch.
        assert.equal(
          new Set(ids).size,
          ids.length,
          `${file}: card ${String(id)} plays ${ids.join(' + ')} — the same cue twice`,
        );
        if (arrives && cast.has(id)) suppressed += 1;
      }
    }
  }
  // Every recording of this deck has them: a Vehicle, an Aura or a creature
  // that was cast and resolved between two snapshots.
  assert.ok(batches > 20, `only ${String(batches)} cast-and-entered batches in the whole corpus`);
  assert.ok(suppressed > 20, `rule 5 never actually fired (${String(suppressed)})`);
  console.log(`  ${String(batches)} batches cast-and-entered in one snapshot; rule 5 fired ${String(suppressed)}×`);
});

// ---------------------------------------------------------------------------
// E5 — the per-card table, measured rather than admired
// ---------------------------------------------------------------------------

/**
 * **Which `cues.json` `cards` entries actually fire, over the whole corpus.**
 *
 * A per-card cue file is the most fun part of this project and the easiest
 * place to write something that looks right and never runs: a selector the
 * engine cannot emit, a card name that is spelled differently on the wire, an
 * entry shadowed by a more specific one. `validateCues` catches the typo; only
 * a sweep catches the *dead* entry.
 *
 * So this prints the census — card, selector, how many times it beat the
 * archetype and the default — and fails if the table is mostly decorative.
 */
test('replay-cues: the S.H.I.E.L.D. per-card cues fire on the real corpus', () => {
  const fired = new Map<string, { cue: string; count: number }>();
  const archetypes = new Map<string, { cue: string; count: number }>();
  let cardHits = 0;
  let archetypeHits = 0;
  let total = 0;

  for (const file of fixtureFiles()) {
    for (const { state, events } of framesOf(file)) {
      for (const event of events) {
        const subject = subjectOf(event, state);
        const selectors = selectorsFor(event, state);
        const found = resolve(selectors, event.kind, subject, CUES);
        total += 1;
        if (found.source === 'archetype' && subject !== null) {
          archetypeHits += 1;
          const key = `${archetypeKey(subject)} · ${found.selector}`;
          const row = archetypes.get(key) ?? { cue: found.spec.cue, count: 0 };
          row.count += 1;
          archetypes.set(key, row);
          continue;
        }
        if (found.source !== 'card') continue;
        cardHits += 1;
        const name = (subject as { name?: string } | null)?.name ?? '?';
        const key = `${name} · ${found.selector}`;
        const row = fired.get(key) ?? { cue: found.spec.cue, count: 0 };
        row.count += 1;
        fired.set(key, row);
      }
    }
  }

  const rows = [...fired.entries()].sort((a, b) => b[1].count - a[1].count);
  console.log(`  ${String(cardHits)} of ${String(total)} events resolved to a PER-CARD cue:`);
  for (const [key, row] of rows) {
    console.log(`    ${key.padEnd(46)} → ${row.cue.padEnd(16)} ×${String(row.count)}`);
  }
  console.log(`  ${String(archetypeHits)} resolved to an ARCHETYPE cue:`);
  for (const [key, row] of [...archetypes.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`    ${key.padEnd(46)} → ${row.cue.padEnd(16)} ×${String(row.count)}`);
  }

  // The corpus is eighteen recordings of this deck, so a table keyed to this
  // deck must be doing real work in it.
  assert.ok(
    fired.size >= 20,
    `only ${String(fired.size)} per-card entries ever fired — the table is decorative`,
  );
  assert.ok(cardHits > 200, `only ${String(cardHits)} per-card resolutions in the whole corpus`);

  // The cues the M7 brief tells a reader to look for, by cue id.
  const cues = new Set([...fired.values()].map((row) => row.cue));
  for (const id of [
    'fx.terrain',
    // **T4 renamed the land tap.** It was `fx.ripple`; it is now `land.tap`,
    // which is the ripple *and* the mana mote, and the rename is the point: the
    // mote is a claim that this card is a land, and the cue id is where the
    // ladder's decision to say so is recorded. `fx.ripple` is still in the
    // registry and is still what a tapping *creature* gets — no card in this deck
    // does that anywhere in the corpus, which is why it left this list.
    'land.tap',
    'fx.flyIn',
    'fx.shockwave',
    'attack.shrink',
    'attack.aegis',
    'fx.webWrap',
    'fx.strike',
    'fx.scaleBeam',
    'fx.collapse',
    'fx.hologram',
    'fx.agents',
    'attack.jet',
    'fx.circuit',
    'fx.swarm',
  ]) {
    assert.ok(cues.has(id), `no per-card resolution ever produced ${id}`);
  }

  /**
   * **Coulson's badge is an ARCHETYPE cue, and this is why.**
   *
   * §3.6's `counters` event carries the card, the counter type and the two
   * values and **no source**, so "Coulson put this here" is not on the wire and
   * no renderer may claim it. The badge is therefore keyed to the card that
   * *received* the counter — `creature/W`, which in this deck is exactly the
   * S.H.I.E.L.D. Heroes — and Coulson's own entry covers the case where the
   * counter lands on him. In eighteen recordings it never did, which is the
   * kind of thing only a census tells you.
   */
  const archetypeCues = new Set([...archetypes.values()].map((row) => row.cue));
  assert.ok(archetypeCues.has('fx.badge'), 'the +1/+1 badge never fired on any Hero');
});

/**
 * **A `presence` changes the resting pose and survives a flush** (§5.1's one
 * exception, §10.4's last bullet).
 *
 * The Helicarrier is not in every recording, so this builds the frame instead of
 * hunting for one: the assertion is about `layout()`, not about the corpus.
 */
test('layout: a presence hovers a card, and skip/flush cannot put it down', () => {
  const file = 'games/g1.jsonl';
  const frames = framesOf(file);
  const frame = frames.find((f) => f.state.board !== null);
  assert.ok(frame !== undefined);
  const board = frame.state.board;
  assert.ok(board !== null);

  const field = board.players[0]?.zones.battlefield.cards ?? [];
  const card = field.find((c) => !isHidden(c));
  if (card === undefined) return; // an empty board this early is legitimate
  const name = (card as { name?: string }).name ?? '';
  assert.ok(name !== '');

  const flat = layout(frame.state);
  const lifted = layout(frame.state, { [name]: { hoverY: 0.9, bobAmp: 0.03, bobHz: 0.25 } });
  const before = flat.byKey.get(`c:${String(card.id)}`);
  const after = lifted.byKey.get(`c:${String(card.id)}`);
  assert.ok(before !== undefined && after !== undefined);
  assert.ok(
    Math.abs(after.position[1] - (before.position[1] + 0.9)) < 1e-9,
    'the hover is folded into the RESTING pose, not into an offset',
  );
  assert.equal(after.bobAmp, 0.03);
  assert.equal(lifted.bobbing, true);
  assert.equal(flat.bobbing, false);

  // The proof that a skip cannot put it down: `flushAndSnap()` clears offsets,
  // and the hover is not an offset — the placement still carries it.
  const stage = new NullStage();
  const queue = new CueQueue({ stage, registry: REGISTRY, data: CUES, mode: 'replay' });
  queue.enqueueBatch(frame.events, frame.state);
  queue.flushAndSnap();
  assert.equal(stage.offsets.size, 0);
  assert.ok(lifted.byKey.get(`c:${String(card.id)}`)?.position[1] === after.position[1]);
});

// ---------------------------------------------------------------------------
// The redaction net
// ---------------------------------------------------------------------------

function assertNoNames(cue: Cue, names: ReadonlySet<string>, file: string): void {
  for (const [key, value] of Object.entries(cue.params)) {
    if (typeof value !== 'string') continue;
    assertStringIsClean(value, names, `${file} (${cue.id}.${key})`);
  }
}

function assertStringIsClean(value: string, names: ReadonlySet<string>, where: string): void {
  const lower = value.toLowerCase();
  for (const name of names) {
    assert.ok(!lower.includes(name), `${where}: the string ${JSON.stringify(value)} carries a card name`);
  }
  // §3.6 rule 1's sweep, in the renderer: `name (id)` is the shape that joins a
  // concealed card to its id, and nothing the arena draws may look like it.
  assert.ok(!/\(\d+\)/.test(value), `${where}: ${JSON.stringify(value)} looks like an id join`);
}

// ---------------------------------------------------------------------------
// Tier 2 slice 3 (T11) — the per-card beats, measured on the corpus
// ---------------------------------------------------------------------------

/**
 * **Which of T11's beats the committed corpus actually plays, and how often the
 * wire AIMED them.** The planner is driven exactly as `Arena.tsx`'s intake drives
 * it — with the previous frame's board — so a `resolved` carries T6's `strikeCard`
 * when the previous frame's stack said what the item targeted, and a `cast` its
 * `beamTo` when this frame's does.
 *
 * It prints the census and pins the beats that are this slice's claims: Quake's
 * fissure reaching what her trigger targeted, Helicarrier Strike's lock and its
 * beam, Web Up's wrap on a named target, Pym Particles following the target's
 * size, the Air Force's aimed sweep, the scientists' power-up flights and
 * Coulson's badges. The beats the corpus never plays are named — Wasp's trigger is
 * never on the wire long enough to aim (its evidence is a synthetic event).
 */
test('replay-cues: slice 3 — the per-card beats fire on the corpus, and say when the wire aimed them', () => {
  const rows = new Map<string, { fired: number; aimed: number }>();
  const bump = (key: string, aimed: boolean): void => {
    const row = rows.get(key) ?? { fired: 0, aimed: 0 };
    row.fired += 1;
    if (aimed) row.aimed += 1;
    rows.set(key, row);
  };
  let rule7 = 0;
  for (const file of fixtureFiles()) {
    let previous: ClientState['board'] = null;
    for (const { state, events } of framesOf(file)) {
      const steps = planBatch(events, state, CUES, previous);
      const cues = steps.flatMap((step) => step.cues);
      for (const cue of cues) {
        const subject = cue.targets[0] === undefined || state.board === null ? undefined : findCard(state.board, cue.targets[0]);
        const name = (subject as { name?: string } | undefined)?.name ?? '';
        const p = cue.params;
        const aimed =
          (typeof p['beamTo'] === 'number' && p['beamTo'] >= 0) || (typeof p['strikeCard'] === 'number' && p['strikeCard'] >= 0);
        if (name === 'Quake, Agent of S.H.I.E.L.D.' && cue.id === 'fx.shockwave') bump('Quake · fx.shockwave (fissure)', aimed);
        if (name === 'Helicarrier Strike' && cue.id === 'fx.strike') bump(`Helicarrier Strike · fx.strike ${p['lock'] === true ? '(lock)' : '(beam)'}`, aimed);
        if (name === 'Web Up' && cue.id === 'fx.webWrap') bump(`Web Up · fx.webWrap [${cue.selector}]`, aimed);
        if (name === 'Pym Particles' && cue.id === 'fx.scaleBeam') bump(`Pym Particles · fx.scaleBeam [${cue.selector}] grew=${String(p['strikeGrew'] ?? 0)}`, aimed);
        if (name === 'Wasp, Shrinking Savior' && cue.id === 'fx.scaleBeam') bump(`Wasp · fx.scaleBeam [${cue.selector}]`, aimed);
        if (name === "Ant-Man's Air Force" && cue.id === 'fx.swarm') bump(`Air Force · fx.swarm sweep [${cue.selector}]`, aimed);
        if (cue.id === 'fx.hologram' && typeof p['toHand'] === 'number' && p['toHand'] > 0) bump(`${name} · power-up (${String(p['toHand'])} to hand)`, false);
        if (cue.id === 'fx.badge') bump(`${cue.selector === 'resolved' ? 'Coulson · his own badge' : 'a Hero · badge on the receiver'}`, false);
        if (cue.id === 'attack.shrink') bump('Ant-Man · attack.shrink (speck)', false);
        if (cue.id === 'attack.aegis') bump('Peggy · attack.aegis (shield)', false);
        if (cue.id === 'attack.jet' && p['laser'] === true) bump('Doombot · attack.jet (laser)', false);
        if (cue.id === 'attack.lunge' && p['muzzle'] === true) bump('Agent 13 · attack.lunge (muzzle)', false);
        if (cue.id === 'attack.lunge' && name === 'Agents of S.H.I.E.L.D.') bump(`Agents · attack.lunge [${cue.selector}]${p['spotlight'] === 1 ? ' spotlight' : ''}`, false);
        if (cue.id === 'fx.agents' && p['beams'] === true) bump('Fury · fx.agents (radio call, beams)', false);
        if (cue.id === 'cast.rise' && p['freeze'] === true) bump('Strategic Intervention · freeze-frame', false);
        if (cue.id === 'attach.snap' && typeof p['flourish'] === 'string') bump(`${name} · attach.snap flourish ${p['flourish']}`, false);
      }
      // Rule 7, counted from the RAW ladder output: one card whose `cast` and whose
      // `resolved` both resolved to the same cue id in this batch.
      const kinds = new Map<string, Set<string>>();
      for (const event of events) {
        if (event.kind !== 'cast' && event.kind !== 'resolved') continue;
        for (const cue of cuesFor(event, state, CUES, previous)) {
          const key = `${cue.id}|${String(cue.targets[0])}`;
          const set = kinds.get(key) ?? new Set<string>();
          set.add(cue.kind);
          kinds.set(key, set);
        }
      }
      for (const set of kinds.values()) if (set.size === 2) rule7 += 1;
      previous = state.board;
    }
  }
  console.log('  slice 3 per-card beat                                     fired  aimed');
  for (const [key, row] of [...rows.entries()].sort()) {
    console.log(`    ${key.padEnd(56)} ${String(row.fired).padStart(4)}  ${String(row.aimed).padStart(4)}`);
  }
  const row = (key: string): { fired: number; aimed: number } => rows.get(key) ?? { fired: 0, aimed: 0 };
  // Quake: her trigger's resolution shakes the table, and the fissure reaches its
  // target whenever the previous frame said what that was.
  assert.ok(row('Quake · fx.shockwave (fissure)').fired >= 10, 'Quake’s resolution is not the shockwave');
  assert.ok(row('Quake · fx.shockwave (fissure)').aimed >= 4, 'Quake’s fissure never had an aim');
  // Helicarrier Strike: the lock on the cast, the beam on the resolution.
  assert.ok(row('Helicarrier Strike · fx.strike (lock)').aimed >= 2);
  assert.ok(row('Helicarrier Strike · fx.strike (beam)').aimed >= 1);
  // Web Up: the wrap reaches a named target on both of its events.
  assert.ok(row('Web Up · fx.webWrap [cast]').aimed >= 1);
  assert.ok(row('Web Up · fx.webWrap [resolved]').aimed >= 3);
  // The Air Force sweeps to a named target at least once.
  const sweeps = [...rows.entries()].filter(([k]) => k.startsWith('Air Force'));
  assert.ok(sweeps.some(([, r]) => r.aimed > 0), 'the Air Force never swept at a named target');
  // Pym Particles: aimed on its resolution, with the direction off the snapshot.
  assert.ok([...rows.entries()].some(([k, r]) => k.startsWith('Pym Particles · fx.scaleBeam [resolved]') && r.aimed > 0));
  // Wasp's attack trigger is never aimed in the corpus — said, not hidden.
  const wasp = [...rows.entries()].filter(([k]) => k.startsWith('Wasp'));
  assert.ok(wasp.length > 0 && wasp.every(([, r]) => r.aimed === 0), 'the corpus now aims a Wasp trigger — update the evidence');
  // The power-ups, the badges, the attackers' beats.
  assert.ok([...rows.keys()].some((k) => k.includes('power-up')), 'no scientist power-up sent a card to hand');
  assert.ok(row('a Hero · badge on the receiver').fired >= 9);
  assert.ok(row('Coulson · his own badge').fired >= 1);
  assert.ok(row('Ant-Man · attack.shrink (speck)').fired >= 1);
  assert.ok(row('Peggy · attack.aegis (shield)').fired >= 4);
  assert.ok(row('Doombot · attack.jet (laser)').fired >= 5);
  assert.ok(row('Strategic Intervention · freeze-frame').fired >= 1);
  console.log(`  suppression rule 7 (one card's cast AND resolved naming one cue) fired ${String(rule7)}×`);
});

test('queue: rule 7 — a card whose cast and resolved name one cue plays it once, the aimed one', () => {
  // g1.jsonl frame 139's shape: Web Up's spell resolves and its enter trigger goes
  // on the stack in one snapshot. Built by hand so the aim can be placed on either.
  const state = initialState();
  const webUp = (castAim: boolean): string[] => {
    const cues = planBatch(
      [
        { kind: 'resolved', cardId: 27, fizzled: false },
        { kind: 'cast', stackId: 5, cardId: 27, controller: 0, text: '' },
      ],
      state,
      { version: 1, cards: {}, archetypes: {}, defaults: { resolved: { cue: 'fx.webWrap', ms: 400 }, cast: { cue: 'fx.webWrap', ms: 400 } } },
      castAim
        ? null
        : ({
            players: [],
            stackCards: [],
            stack: [{ id: 4, sourceCardId: 27, controller: 0, text: '', targetCardIds: [80], targetPlayerIds: [] }],
          } as unknown as ClientState['board']),
    ).flatMap((s) => s.cues);
    return cues.map((c) => `${c.kind}${typeof c.params['strikeCard'] === 'number' ? '*' : ''}`);
  };
  // With the resolution aimed (the previous frame named its target), it wins.
  assert.deepEqual(webUp(false), ['resolved*']);
  // With neither aimed, the first in engine order plays, once.
  assert.deepEqual(webUp(true), ['resolved']);
});
