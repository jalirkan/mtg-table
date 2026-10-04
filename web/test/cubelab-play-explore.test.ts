// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * The cube lab's play exploration, its TypeScript half (tools/cubelab/playexplore.ts, D358):
 *
 *  - `--play-explore` parses `on` and `name=value` (repeated or comma-separated),
 *    and refuses a bad value or a setting that explores nothing;
 *  - whether a draft explores is a pure function of its seed, follows the share
 *    over many seeds, and comes from a stream of its own (the draft itself is
 *    bit for bit the same with or without it);
 *  - every reader of win rates leaves exploring drafts out by default: readRun
 *    (report, meta), readRunData (learn) and the queue's coverage;
 *  - the version stamp is the old one when exploration is off and another one
 *    when it is on (a change between nights is a D341 version change).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readRun } from '../../tools/cubelab/cli.ts';
import { readRunData } from '../../tools/cubelab/learncmd.ts';
import {
  draftExplores, filterPlayExplore, isPlayExplored, parsePlayExploreArgs, PLAY_EXPLORE_DEFAULTS, playExploreTag, playExploreText,
} from '../../tools/cubelab/playexplore.ts';
import { gamesByCard } from '../../tools/cubelab/queue.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import { labVersion } from '../../tools/cubelab/versions.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';

const REPO = fileURLToPath(new URL('../..', import.meta.url));

test('play exploration: parse on and name=value, refuse the rest', () => {
  assert.equal(parsePlayExploreArgs([]), null);
  assert.deepEqual(parsePlayExploreArgs(['on']), PLAY_EXPLORE_DEFAULTS);
  assert.deepEqual(parsePlayExploreArgs(['share=0.15,epsilon=0.05,closecall=0.02']), { share: 0.15, epsilon: 0.05, closeCall: 0.02, opening: false });
  assert.deepEqual(parsePlayExploreArgs(['share=0.5', 'eps=0.1', 'cc=0', 'opening=on']), { share: 0.5, epsilon: 0.1, closeCall: 0, opening: true });
  const o = parsePlayExploreArgs(['share=0.15,epsilon=0.05,closecall=0.02,opening=on']);
  assert.deepEqual(parsePlayExploreArgs([playExploreText(o!)]), o, 'the printed form parses back');
  assert.deepEqual(playExploreTag(o!), { epsilon: 0.05, closeCall: 0.02, opening: true });
  for (const bad of [['share=0'], ['share=1.5'], ['epsilon=2'], ['closecall=1'], ['opening=yes'], ['temperature=1'], ['share'],
    ['epsilon=0,closecall=0']]) {
    assert.throws(() => parsePlayExploreArgs(bad), /play-explore/, bad.join(' '));
  }
});

test('play exploration: a draft explores by its seed alone, at the share, from its own stream', () => {
  assert.equal(draftExplores(1234, 0.15), draftExplores(1234, 0.15));
  assert.equal(draftExplores(1234, 0), false);
  for (let s = 1; s <= 200; s++) assert.equal(draftExplores(s, 1), true);
  const n = 20000;
  let k = 0;
  for (let s = 1; s <= n; s++) if (draftExplores(s, 0.15)) k++;
  const se = Math.sqrt(0.15 * 0.85 / n);
  assert.ok(Math.abs(k / n - 0.15) < 4 * se, `${k} of ${n}`);
  // a smaller share explores a subset of a larger one's drafts (one uniform draw per seed)
  for (let s = 1; s <= 2000; s++) if (draftExplores(s, 0.1)) assert.equal(draftExplores(s, 0.3), true);
  // its own stream: the draft's generator is not the play-explore one
  assert.notEqual(rng(7, 'draft:grid').next(), rng(7, 'play-explore').next());
});

test('play exploration: filterPlayExplore and isPlayExplored', () => {
  const recs = [{ seed: 1 }, { seed: 2, playExplore: { epsilon: 0.05, closeCall: 0.02, opening: false } }, { seed: 3 }];
  assert.equal(isPlayExplored(recs[1]!), true);
  assert.equal(isPlayExplored(recs[0]!), false);
  assert.deepEqual(filterPlayExplore(recs).recs.map((r) => r.seed), [1, 3]);
  assert.equal(filterPlayExplore(recs).dropped, 1);
  assert.deepEqual(filterPlayExplore(recs, 'only').recs.map((r) => r.seed), [2]);
  assert.deepEqual(filterPlayExplore(recs, 'include').recs.map((r) => r.seed), [1, 2, 3]);
});

/** A run folder holding the committed exploring draft and a plain twin of it (another seed). */
function twinRun(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'play-explore-'));
  const src = path.join(REPO, 'fixtures/cubelab/explore');
  fs.copyFileSync(path.join(src, 'run.json'), path.join(dir, 'run.json'));
  fs.writeFileSync(path.join(dir, 'cards.json'), '{}\n');
  const explored = JSON.parse(fs.readFileSync(path.join(src, 'drafts.jsonl'), 'utf8').trim());
  const plain = structuredClone(explored);
  plain.seed = 7;
  delete plain.playExplore;
  for (const g of plain.match.games) delete g.playExplore;
  fs.writeFileSync(path.join(dir, 'drafts.jsonl'), `${JSON.stringify(explored)}\n${JSON.stringify(plain)}\n`);
  return dir;
}

test('play exploration: report, meta, learn and the queue coverage leave exploring drafts out', () => {
  const dir = twinRun();
  try {
    const r = readRun(dir);
    assert.deepEqual(r.recs.map((x) => x.seed), [7]);
    assert.equal(r.playExploreDropped, 1);
    assert.deepEqual(readRun(dir, 'include').recs.map((x) => x.seed).sort(), [102, 7].sort());
    assert.deepEqual(readRun(dir, 'only').recs.map((x) => x.seed), [102]);
    const d = readRunData(dir);
    assert.deepEqual(d.recs.map((x) => x.seed), [7]);
    assert.equal(d.playExploreDropped, 1);
    // coverage: the same decks counted once (the plain twin), not twice
    const g = gamesByCard([dir]);
    const plain = d.recs[0]!;
    const decisive = plain.match.games.filter((x) => x.winner === 'A' || x.winner === 'B').length;
    const someCard = plain.drafters[0].deck!.main.find(([, n]) => !['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].includes(n))![1];
    assert.equal(g.get(someCard), decisive);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('play exploration: part of the lab version only when on', () => {
  const x = { cubeShas: ['c'], ratingsFiles: [null], forgeJar: null };
  const off = labVersion(REPO, { ...x, weights: DEFAULT_WEIGHTS });
  const offAgain = labVersion(REPO, { ...x, weights: DEFAULT_WEIGHTS });
  assert.equal(off.id, offAgain.id);
  const pe = { share: 0.15, epsilon: 0.05, closeCall: 0.02, opening: false };
  // run.ts folds it into the weights' hash the way D356's deck exploration is folded
  const on = labVersion(REPO, { ...x, weights: { ...DEFAULT_WEIGHTS, playExplore: pe } });
  assert.notEqual(on.id, off.id);
  assert.notEqual(on.weightsSha, off.weightsSha);
  const other = labVersion(REPO, { ...x, weights: { ...DEFAULT_WEIGHTS, playExplore: { ...pe, epsilon: 0.1 } } });
  assert.notEqual(other.id, on.id);
});
