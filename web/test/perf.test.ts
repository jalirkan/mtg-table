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

import {
  DPR_FLOOR,
  GOVERNOR,
  dprCeiling,
  dprRungs,
  lateRate,
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
