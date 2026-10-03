// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Seed separation and version stamps (tools/cubelab/seeds.ts, versions.ts;
 * D332-D334, methodology review 2 N1/N4/N5):
 *
 *  - a plain run refuses any seed in the deck sets' reserved range, and a
 *    `--deckset` run is allowed only there and only with --games 0;
 *  - the queue's ledger never plans a chunk past the lab range, and a plan
 *    with one is refused;
 *  - the resume rule: the same version appends, a new folder starts a list, a
 *    different version (or a pre-D333 folder with drafts) is refused, and
 *    --allow-version-change appends it with what changed, logged;
 *  - the version id moves with the code tree, the jar, the ratings, the cube
 *    and the weights, and not with the Node version;
 *  - power.tsv: sdPost is read, an old bootstrap-only `sd` file is refused,
 *    an AI-limited card counts 0.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { assertNoDuplicates, readPowerSd, type NightPlan } from '../../tools/cubelab/queue.ts';
import { assertQueueSeeds, assertRunSeeds, isReservedSeed, RESERVED_SEED_MIN, reservedOverlap, VERIFY_SEED_MIN } from '../../tools/cubelab/seeds.ts';
import { resumeVersions, versionDiff, versionId, type LabVersion } from '../../tools/cubelab/versions.ts';

test('seeds: the reserved range is refused to plain runs and is the only place for a deck set', () => {
  assert.equal(isReservedSeed(RESERVED_SEED_MIN), true);
  assert.equal(isReservedSeed(9100), false);
  assert.deepEqual(reservedOverlap(RESERVED_SEED_MIN - 5, 10), [RESERVED_SEED_MIN, RESERVED_SEED_MIN + 4]);
  assert.equal(reservedOverlap(1, 1000), null);
  assertRunSeeds(1, 1000, { games: 1 });
  assertRunSeeds(VERIFY_SEED_MIN, 8000, { games: 1 });
  assert.throws(() => assertRunSeeds(RESERVED_SEED_MIN, 10, { games: 1 }), /RESERVED/);
  assert.throws(() => assertRunSeeds(RESERVED_SEED_MIN - 5, 10, { games: 0 }), /RESERVED/);
  assertRunSeeds(RESERVED_SEED_MIN, 10, { games: 0, deckset: true });
  assert.throws(() => assertRunSeeds(RESERVED_SEED_MIN, 10, { games: 1, deckset: true }), /--games 0/);
  assert.throws(() => assertRunSeeds(9100, 10, { games: 0, deckset: true }), /reserved|900000000/);
});

test('seeds: the queue stays in the lab range', () => {
  assertQueueSeeds('normal/synergy', 1, 250);
  assert.throws(() => assertQueueSeeds('normal/synergy', VERIFY_SEED_MIN - 10, 250), /lab range/);
  const plan = { night: 1, chunks: [{ key: 'normal/x', kind: 'normal', cubes: ['x'], seed: RESERVED_SEED_MIN, drafts: 5 }] } as unknown as NightPlan;
  assert.throws(() => assertNoDuplicates([plan]), /lab range/);
});

const base: Omit<LabVersion, 'id'> = {
  gitSha: 'a'.repeat(40), codeTree: 'c1', dirty: false, diffSha: null, forgeJarSha256: 'j1', ratingsSha256: 'r1', cubeSha: 'k1', weightsSha: 'w1', node: 'v24.0.0',
};
const ver = (o: Partial<LabVersion> = {}): LabVersion => { const v = { ...base, ...o }; return { ...v, id: versionId(v) }; };

test('versions: the id moves with what makes a draft, not with Node or a docs commit', () => {
  const v = ver();
  assert.equal(ver({ node: 'v22.0.0' }).id, v.id);
  assert.equal(ver({ gitSha: 'b'.repeat(40) }).id, v.id, 'HEAD alone (a docs commit) does not change the version');
  for (const k of ['codeTree', 'forgeJarSha256', 'ratingsSha256', 'cubeSha', 'weightsSha', 'diffSha'] as const) {
    assert.notEqual(ver({ [k]: 'other' }).id, v.id, k);
  }
  assert.notEqual(ver({ dirty: true }).id, v.id);
  assert.deepEqual(versionDiff(v, ver({ forgeJarSha256: 'j2', ratingsSha256: 'r2' })), ['forgeJarSha256', 'ratingsSha256']);
});

test('versions: the resume rule refuses a mixed folder unless --allow-version-change, and logs it', () => {
  const said: string[] = [];
  const say = (s: string): void => { said.push(s); };
  const v1 = ver();
  const first = resumeVersions(null, v1, 1, false, 'out', say, 't0');
  assert.equal(first.length, 1);
  assert.equal(first[0]?.firstSeed, 1);
  assert.deepEqual(resumeVersions(first, v1, 251, false, 'out', say, 't1'), first, 'same version: appended without a new entry');
  const v2 = ver({ forgeJarSha256: 'j2' });
  assert.throws(() => resumeVersions(first, v2, 251, false, 'out', say), /--allow-version-change[\s\S]*forgeJarSha256|forgeJarSha256[\s\S]*--allow-version-change/);
  const both = resumeVersions(first, v2, 251, true, 'out', say, 't2');
  assert.equal(both.length, 2);
  assert.deepEqual(both[1]?.allowedChange, { flag: '--allow-version-change', changed: ['forgeJarSha256'], from: v1.id });
  assert.match(said.join('\n'), /VERSION CHANGE allowed/);
  // a folder written before version stamps, with drafts in it: unknown version, refused
  assert.throws(() => resumeVersions(undefined, v1, 1, false, 'out', say), /unversioned/);
});

test('power.tsv: sdPost is read, an old bootstrap sd file is refused, an AI-limited card counts 0', () => {
  const d = mkdtempSync(join(tmpdir(), 'power-'));
  const f = join(d, 'power.tsv');
  writeFileSync(f, '# comment\nname\tpower\tsdPost\tsdBoot\tpoints\tprior\tgames\tland\tai\tcubes\nBolt\t0.1\t0.03\t0.01\t2.5\t0\t40\t0\t\tpauper\nLooting\t0\t0.05\t0\t0\t0\t3\t0\tlimited\tpauper\n');
  const m = readPowerSd(f);
  assert.equal(m.get('Bolt'), 0.03);
  assert.equal(m.get('Looting'), 0);
  writeFileSync(f, 'name\tpower\tsd\nBolt\t0.1\t0.01\n');
  assert.throws(() => readPowerSd(f), /old power\.tsv/);
});
