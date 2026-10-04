/*
 * mtg-table — the calibration reader (tools/cubelab/calibrate.ts, D376): between-batch dispersion against the binomial.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dispersion, loadSummary, type Tally } from '../../tools/cubelab/calibrate.ts';
import type { DraftRecord } from '../../tools/cubelab/run.ts';
import { rng } from '../../tools/cubelab/rng.ts';

function batch(seed: number, groups: number, games: number, rateOf: (g: number) => number): Map<string, Tally> {
  const r = rng(seed, 'calibrate-test');
  const m = new Map<string, Tally>();
  for (let g = 0; g < groups; g++) {
    let w = 0;
    const p = rateOf(g);
    for (let i = 0; i < games; i++) if (r.next() < p) w++;
    m.set(`g${g}`, { wins: w, games });
  }
  return m;
}

test('calibrate (D376): two binomial batches of the same thing disperse like the binomial', () => {
  const d = dispersion(batch(1, 400, 600, () => 0.5), batch(2, 400, 600, () => 0.5), 100);
  assert.equal(d.groups, 400);
  assert.ok(d.dispersion > 0.85 && d.dispersion < 1.15, `dispersion ${d.dispersion}`);
  assert.ok(d.sdRatio > 0.92 && d.sdRatio < 1.08, `sd ratio ${d.sdRatio}`);
});

test('calibrate (D376): a batch-level shift per group shows as dispersion above 1', () => {
  const shiftA = (g: number) => 0.5 + (g % 2 ? 0.03 : -0.03);
  const shiftB = (g: number) => 0.5 - (g % 2 ? 0.03 : -0.03);
  const d = dispersion(batch(3, 400, 600, shiftA), batch(4, 400, 600, shiftB), 100);
  // (0.06)^2 / (0.25 * 2 / 600) adds about 4.3
  assert.ok(d.dispersion > 4, `dispersion ${d.dispersion}`);
  assert.ok(Math.abs(d.worst[0]?.z ?? 0) >= Math.abs(d.worst[1]?.z ?? 0));
});

test('calibrate (D376): groups under --min-games in either batch are left out', () => {
  const a = new Map([['x', { wins: 50, games: 100 }], ['y', { wins: 5, games: 10 }]]);
  const b = new Map([['x', { wins: 60, games: 100 }], ['y', { wins: 50, games: 100 }]]);
  assert.equal(dispersion(a, b, 50).groups, 1);
});

test('calibrate (D376): the load summary reads the stamps and the games\' clocks, and old rows without them', () => {
  const row = (load: DraftRecord['match']['load'], timeout: boolean) => ({
    match: { load, games: [{ timeout, ms: 1000, gameCpuMs: 600 }, { timeout: false, ms: 1000, gameCpuMs: 400 }] },
  }) as unknown as DraftRecord;
  const s = loadSummary([row({ busy: 7, alive: 7, load1: 14, cpus: 16 }, true), row({ busy: 5, alive: 7, load1: 8, cpus: 16 }, false), row(undefined, false)]);
  assert.equal(s.matches, 3);
  assert.equal(s.stamped, 2);
  assert.equal(s.busyMean, 6);
  assert.equal(s.load1Max, 14 / 16);
  assert.equal(s.timeouts, 1);
  assert.equal(s.games, 6);
  assert.equal(s.cpuShare, 0.5);
});
