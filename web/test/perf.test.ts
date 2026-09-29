/*
 * mtg-table — web/test/perf.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The resolution ladder** (report 09 §9.2 rule 9 and §9.4; M7 verification
 * fix).
 *
 * The arena gives back *pixels* when frames arrive late — the scene is fill-rate
 * bound, and at 1920×993 under a software rasteriser the same 35 draw calls cost
 * p95 22.40 ms at render dpr 1 and 14.00 ms at 0.75. Two things about that
 * ladder are pure arithmetic and both of them were wrong once, so both are
 * tested here with no GPU anywhere:
 *
 *  1. **The rungs.** Stepping by ±0.25 and clamping at the 0.6 floor is not a
 *     ladder: 1.00 → 0.75 → 0.50 clamps to 0.60, and a step back *up* from there
 *     lands on **0.85** — a resolution that is on no ladder and that measured
 *     p95 16.80 where the 0.75 below it measured 14.00. Moving by *index* over a
 *     precomputed rung list cannot do that, and this file is the proof.
 *  2. **The trigger.** It is a *rate* of late frames, not a percentile of a
 *     48-frame window: over such a window a p95 is within a frame of the maximum,
 *     so one 31 ms outlier — and there are outliers at every resolution — reads
 *     as "still too slow" and the ladder walks to the floor.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { governorFrame, governorWindow, restartWindow, type GovernorConfig } from '../src/arena/governor.ts';
import {
  DPR_FLOOR,
  GOVERNOR,
  dprCeiling,
  dprRungs,
  lateRate,
  postOnFloor,
  rungFrom,
  worstOf,
} from '../src/arena/perf.ts';

test('perf: the rungs run from the ceiling to the floor and stop', () => {
  assert.deepEqual(dprRungs(1), [1, 0.75, DPR_FLOOR]);
  assert.deepEqual(dprRungs(1.5), [1.5, 1.25, 1, 0.75, DPR_FLOOR]);
  // A display whose ratio is already below the floor gets the floor and nothing
  // else — there is nothing to give back.
  assert.deepEqual(dprRungs(0.5), [DPR_FLOOR]);

  for (const ceiling of [1, 1.25, 1.5]) {
    const rungs = dprRungs(ceiling);
    assert.equal(rungs[0], ceiling, 'the first rung is the ceiling');
    assert.equal(rungs[rungs.length - 1], DPR_FLOOR, 'the last rung is the floor');
    for (let i = 1; i < rungs.length; i++) {
      assert.ok(rungs[i]! < rungs[i - 1]!, 'rungs descend');
      assert.ok(rungs[i]! >= DPR_FLOOR, 'and never go below the floor');
    }
  }
});

test('perf: a step down then up returns to the rung it left — never to 0.85', () => {
  // The measured trajectory of the bench run: the ladder steps twice down under
  // the load of a scrub and comes back up one rung when the frames recover.
  const down1 = rungFrom(1, -1, 1);
  assert.equal(down1, 0.75);
  const down2 = rungFrom(down1, -1, 1);
  assert.equal(down2, DPR_FLOOR);
  const up = rungFrom(down2, 1, 1);
  assert.equal(up, 0.75, 'climbing out of the floor must land on a real rung, not on 0.85');

  // The arithmetic that used to be here, kept as the negative control: this is
  // what "clamp, then add the step back" produces, and 0.85 is on no ladder.
  const naive = Math.min(1, Math.max(DPR_FLOOR, DPR_FLOOR + GOVERNOR.step));
  assert.equal(Number(naive.toFixed(2)), 0.85);
  assert.notEqual(up, Number(naive.toFixed(2)));
});

test('perf: the ladder clamps at both ends and cannot be walked off', () => {
  assert.equal(rungFrom(1, 1, 1), 1, 'already at the ceiling');
  assert.equal(rungFrom(DPR_FLOOR, -1, 1), DPR_FLOOR, 'already at the floor');
  // Twenty steps in either direction land on an end, not on a new number.
  let v = 1;
  for (let i = 0; i < 20; i++) v = rungFrom(v, -1, 1.5);
  assert.equal(v, DPR_FLOOR);
  for (let i = 0; i < 20; i++) v = rungFrom(v, 1, 1.5);
  assert.equal(v, 1.5);
});

test('perf: an off-ladder value snaps to the nearest rung', () => {
  // A `?dpr=` pin that is then unpinned, a device ratio that changed because the
  // window moved to another display: the governor must still know where it is.
  assert.equal(rungFrom(0.85, -1, 1), DPR_FLOOR, '0.85 is nearest 0.75, so down is the floor');
  assert.equal(rungFrom(0.9, 1, 1), 1);
});

test('perf: the trigger is a rate, and the two regimes are an order apart', () => {
  // The measured distributions, as samples. At render dpr 1, 292 of 293 frames
  // exceeded 17 ms; at 0.75, 12 of 488 did, and the worst 48-frame window held
  // 9 of them.
  const slow = Array.from({ length: 48 }, (_, i) => (i === 0 ? 12 : 20));
  const fast = Array.from({ length: 48 }, (_, i) => (i < 9 ? 31 : 12));

  assert.ok(lateRate(slow, GOVERNOR.downMs) > GOVERNOR.lateFraction, 'a slow renderer steps down');
  assert.ok(
    lateRate(fast, GOVERNOR.downMs) <= GOVERNOR.lateFraction,
    'the worst window measured at a PASSING resolution must not step down: ' +
      `${String(lateRate(fast, GOVERNOR.downMs))} vs ${String(GOVERNOR.lateFraction)}`,
  );
  assert.equal(lateRate([], 17), 0, 'no samples is not "late"');

  // And the climb is gated on the worst frame, not on an average, so one
  // outlier is enough to keep the ladder where it is.
  assert.equal(worstOf(fast), 31);
  assert.ok(worstOf(fast) > GOVERNOR.upMs, 'a window with a 31 ms frame does not climb');
  assert.ok(worstOf([8, 9, 10]) <= GOVERNOR.upMs, 'a clean window does');
  assert.equal(worstOf([]), 0);
});

test('perf: the governor’s constants say what the gate says', () => {
  // §9.4's gate is p95 ≤ 20 ms. Acting AT the threshold means living on the
  // wrong side of it, and the up/down gap is the hysteresis.
  assert.ok(GOVERNOR.downMs < 20, 'act before failing the gate, not after');
  assert.ok(GOVERNOR.upMs < GOVERNOR.downMs, 'climb and fall must not share a threshold');
  assert.ok(GOVERNOR.minSamples <= GOVERNOR.window);
  assert.ok(GOVERNOR.parkedMs > GOVERNOR.downMs * 4, 'a parked loop is not a slow frame');
  // With no `window` (this is `node --test`) the ceiling is the plain 1.
  assert.equal(dprCeiling(), 1);
});

/**
 * **The governor takes a decided verdict on the frame that decides it** (the GPU
 * pass, D272).
 *
 * `governor.ts`'s `governorFrame` is the component's decision, pure, so the whole
 * ladder can be run against a machine: each frame costs what the machine's model
 * says at the rung and composer it is on, and the harness does what `Arena.tsx`'s
 * `DprGovernor` does with the answer — a rung (`rungFrom`), or the composer off
 * (`postOnFloor`) and a restarted window. The SwiftShader model is the GPU pass's
 * own measurement at `g1`@316 (`docs/evidence/gpu-pass.md`: ~135 ms a frame at dpr 1
 * with bloom, ~120 at 0.75, ~112 at the floor, ~20 at the floor with bloom off).
 * The control is the window as it was: sixteen frames, and five to settle.
 */
type Machine = (dpr: number, composer: boolean) => number;

const SWIFTSHADER: Machine = (dpr, composer) => (composer ? (dpr >= 1 ? 135 : dpr >= 0.75 ? 120 : 112) : dpr >= 1 ? 36 : dpr >= 0.75 ? 25 : 20);
/** The window as it was: no early verdict, no time-counted settle. */
const AS_WAS: GovernorConfig = { ...GOVERNOR, settleMs: Number.POSITIVE_INFINITY };

function walk(machine: Machine, config: GovernorConfig, early: boolean, ms = 30_000): { floorAt: number; dpr: number; composer: boolean; steps: number } {
  const w = governorWindow(config);
  let dpr = 1;
  let composer = true;
  let now = 1000;
  let steps = 0;
  let floorAt = -1;
  while (now < ms) {
    now += machine(dpr, composer);
    const action = governorFrame(w, now, dpr, config, early);
    if (action === 'down' || action === 'up') {
      dpr = rungFrom(dpr, action === 'down' ? -1 : 1, 1);
      steps += 1;
    } else if (action === 'floor') {
      const drop = postOnFloor(composer, composer);
      if (drop !== null) {
        composer = drop.bloom;
        restartWindow(w, now, config);
        steps += 1;
      }
    }
    if (floorAt < 0 && dpr <= DPR_FLOOR + 1e-6 && !composer) floorAt = now - 1000;
  }
  return { floorAt, dpr, composer, steps };
}

/** The frame on which a window first says "down", or −1. */
function firstDown(machine: Machine, config: GovernorConfig, early: boolean, frames = 4000): number {
  const w = governorWindow(config);
  let now = 1000;
  for (let i = 0; i < frames; i++) {
    now += machine(1, false);
    if (governorFrame(w, now, 1, config, early) === 'down') return i;
  }
  return -1;
}

test('perf: a slow machine reaches the floor rung in about four seconds, where the window as it was took seven (D272)', () => {
  if (dprCeiling() !== 1) return; // the model is written for a device dpr of 1 (node has no window)
  const now_ = walk(SWIFTSHADER, GOVERNOR, true);
  const was = walk(SWIFTSHADER, AS_WAS, false);
  // Both end where the ladder ends: the floor, the composer off, three steps.
  for (const run of [now_, was]) {
    assert.equal(run.dpr, DPR_FLOOR);
    assert.equal(run.composer, false);
    assert.equal(run.steps, 3);
  }
  assert.ok(now_.floorAt > 0 && now_.floorAt < 4500, `the governor took ${String(now_.floorAt)} ms to the floor rung`);
  assert.ok(was.floorAt > 6000, `the control reached the floor in ${String(was.floorAt)} ms — the model no longer shows the slideshow`);
  console.log(`# perf: SwiftShader's model reaches the floor rung in ${(now_.floorAt / 1000).toFixed(2)} s (the window as it was: ${(was.floorAt / 1000).toFixed(2)} s)`);
});

test('perf: an early verdict is the verdict the full window would give — on bursts of every length, and at the refresh rate (D272)', () => {
  // A fast machine (0.5 ms frames) scrubbed onto a crowded board: n frames of uploads
  // of 30, 80 or 150 ms, then fast again. The early verdict steps on exactly the
  // bursts the sixteen-frame window steps on, never later — and never on one it lets pass.
  const burst = (n: number, hitch: number): Machine => {
    let i = 0;
    return () => (i++ < n ? hitch : 0.5);
  };
  let sooner = 0;
  for (const hitch of [30, 80, 150]) {
    for (let n = 1; n <= 24; n++) {
      const early = firstDown(burst(n, hitch), GOVERNOR, true);
      const full = firstDown(burst(n, hitch), GOVERNOR, false);
      assert.equal(early >= 0, full >= 0, `a ${String(n)} × ${String(hitch)} ms burst: early ${String(early)}, full window ${String(full)}`);
      if (early >= 0) {
        assert.ok(early <= full, `the early verdict came later than the full window's (${String(n)} × ${String(hitch)} ms)`);
        if (early < full) sooner += 1;
      }
    }
  }
  assert.ok(sooner > 0, 'the early verdict was never early — the rule no longer does anything');
  // At the refresh rate nothing is late, so nothing is decided early: every decision
  // on the same frame, both ways.
  const cases: Array<[string, Machine]> = [
    ['never late', () => 16.7],
    ['late at every other rung', (dpr) => (dpr > 0.8 ? 16.8 : 16.7)],
    ['a hitch a second', (() => {
      let n = 0;
      return () => (++n % 60 === 0 ? 40 : 16.7);
    })()],
  ];
  for (const [name, machine] of cases) {
    const trace = (config: GovernorConfig, early: boolean): string[] => {
      const w = governorWindow(config);
      const out: string[] = [];
      let now = 1000;
      let dpr = 1;
      for (let i = 0; i < 2000; i++) {
        now += machine(dpr, false);
        const action = governorFrame(w, now, dpr, config, early);
        if (action !== null) out.push(`${String(i)}:${action}`);
        if (action === 'down' || action === 'up') dpr = rungFrom(dpr, action === 'down' ? -1 : 1, 1);
      }
      return out;
    };
    assert.deepEqual(trace(GOVERNOR, true), trace(AS_WAS, false), `${name}: the pass changed a decision at the refresh rate`);
  }
  // The settle, counted in time, is never shorter than five frames at the refresh rate.
  assert.ok(GOVERNOR.settleFrames * 16.7 < GOVERNOR.settleMs);
  assert.ok(GOVERNOR.settleMinFrames >= 2, 'the reallocation frame itself must never end a settle');
});

test('perf: the negative control — a window "enough" after four frames over a quarter-second steps a fast machine down on a burst the full window lets pass (D272)', () => {
  // The pass's first cut of the rule, kept here as the control: a burst of five
  // 80 ms uploads (the first only starts the clock) is four late frames over 320 ms.
  const firstCut = (samples: number[]): boolean => {
    const span = samples.reduce((a, b) => a + b, 0);
    const late = samples.filter((d) => d > GOVERNOR.downMs).length;
    return samples.length >= 4 && span >= 270 && late / samples.length > GOVERNOR.lateFraction;
  };
  assert.ok(firstCut([80, 80, 80, 80]), 'the control no longer fires on the burst');
  const burst: Machine = (() => {
    let i = 0;
    return () => (i++ < 5 ? 80 : 0.5);
  })();
  assert.equal(firstDown(burst, GOVERNOR, true), -1, 'the governor stepped a fast machine down on five uploads');
});
