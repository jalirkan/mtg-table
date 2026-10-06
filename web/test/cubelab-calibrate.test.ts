/*
 * mtg-table — the calibration reader (tools/cubelab/calibrate.ts, D376): between-batch dispersion against the binomial.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { dispersion, firstDrafts, loadSummary, readBatch, readDraftLines, slicesOf, type Batch, type Tally } from '../../tools/cubelab/calibrate.ts';
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

test('calibrate (D377): --first reads the first N drafts by seed; --slice cuts disjoint slices by seed and drops the remainder', () => {
  const X = { dir: 'x', meta: {}, cards: {}, recs: [5, 1, 4, 2, 3, 7, 6].map((seed) => ({ seed })) } as unknown as Batch;
  assert.deepEqual(firstDrafts(X, 3).recs.map((r) => r.seed), [1, 2, 3]);
  assert.equal(firstDrafts(X), X);
  const s = slicesOf(X, 3);
  assert.deepEqual(s.map((b) => b.recs.map((r) => r.seed)), [[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(s.map((b) => b.dir), ['x#1', 'x#2']);
  assert.equal(slicesOf(X, 8).length, 0);
});

// ---------------------------------------------------------------- --flat, end to end (D393)

const REPO = path.resolve(import.meta.dirname, '../..');

/** Two run folders built from the mini fixture: n drafts each, distinct seeds, D376 load stamps. */
function miniBatches(n: number): [string, string] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'calibrate-flat-'));
  const src = path.join(REPO, 'fixtures/cubelab/mini');
  const lines = fs.readFileSync(path.join(src, 'drafts.jsonl'), 'utf8').split('\n').filter(Boolean);
  return (['a', 'b'] as const).map((k, bi) => {
    const dir = path.join(root, k);
    fs.mkdirSync(dir);
    for (const f of ['run.json', 'cards.json']) fs.copyFileSync(path.join(src, f), path.join(dir, f));
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const d = JSON.parse(lines[i % lines.length] as string) as { seed: number; match: { load?: unknown } };
      d.seed = (bi + 1) * 1000 + i + 1;
      d.match.load = { busy: 2, alive: 2, load1: 1, cpus: 4 };
      out.push(JSON.stringify(d));
    }
    fs.writeFileSync(path.join(dir, 'drafts.jsonl'), `${out.join('\n')}\n`);
    return dir;
  }) as [string, string];
}

test('calibrate --flat (D393): the runner\'s `sh:` metric gets ONE JSON object on stdout with every key J085 checked', () => {
  const [a, b] = miniBatches(12);
  // J085's line, on a fixture: relative paths from the checkout, node running the .ts directly, --flat last.
  const r = spawnSync(process.execPath, ['tools/cubelab/calibrate.ts', a, b, '--cube', 'tools/ml/tests/data/mini-cube.md',
    '--pool', 'cubes/omega-seed-pool.tsv', '--notes', 'cubes/omega-notes.tsv', '--min-games', '1', '--slice', '4', '--flat'],
  { cwd: REPO, encoding: 'utf8', timeout: 120_000 });
  assert.equal(r.status, 0, r.stderr);
  const v = JSON.parse(r.stdout.trim()) as Record<string, number>;            // the runner's JSON.parse(stdout.trim())
  for (const k of ['slices', 'a_mean', 'b_mean', 'a_deff', 'b_deff', 'a_load_stamped', 'b_load_stamped', 'a_colour_win_tests', 'b_colour_win_tests']) {
    assert.equal(typeof v[k], 'number', `${k} in ${r.stdout}`);
  }
  assert.equal(v.slices, 6);
  assert.equal(v.a_drafts, 12);
  assert.equal(v.a_load_stamped, 12);
  assert.equal(v.b_load_stamped, 12);
  fs.rmSync(path.dirname(a), { recursive: true, force: true });
});

test('calibrate (D393): drafts.jsonl is read in chunks, strings shared, a torn last line left out; the records are JSON.parse\'s', () => {
  const [a] = miniBatches(5);
  const f = path.join(a, 'drafts.jsonl');
  const whole = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as DraftRecord);
  fs.appendFileSync(f, '{"v": 1, "seed": 99, "match": {"ga');                 // a run still writing
  const got: DraftRecord[] = [];
  readDraftLines(f, (x) => { got.push(x); });
  assert.deepEqual(got, whole);
  for (const bytes of [1, 7, 64, 1000]) {                                         // lines across chunk boundaries
    const small: DraftRecord[] = [];
    readDraftLines(f, (x) => { small.push(x); }, bytes);
    assert.deepEqual(small, whole, `chunks of ${bytes}`);
  }
  assert.deepEqual(readBatch(a).recs, whole);
  fs.rmSync(path.dirname(a), { recursive: true, force: true });
});
