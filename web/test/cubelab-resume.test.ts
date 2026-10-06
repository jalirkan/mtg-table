// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * A key folder's resume checks (D394, run.ts / queue.ts):
 *
 *  - the folder's identity (cube, format, games, profiles, builder, weights, learned files, bridge,
 *    deck exploration) is refused on any change, with or without --allow-version-change, and the
 *    refusal names the fields;
 *  - the profile mix is NOT identity: it is part of the lab version (like D358's play exploration),
 *    so adding it to a folder is a D341 version change -- refused without the flag, appended and
 *    logged with it -- and an unmixed run's version id is what it was before D394;
 *  - `runLab(..., checkOnly)` applies both checks and writes nothing; `checkKeyFolders` reports a
 *    line per key folder of a night, which is what `queue check` and `queue run`'s preflight print.
 *
 * No engine: the card facts come from a cached facts file planted in a scratch repo (engine.ts reads
 * a cached lookup before it would boot one), and nothing here drafts or plays.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseCube } from '../../tools/cubelab/cube.ts';
import type { EngineEnv } from '../../tools/cubelab/engine.ts';
import { parseProfileMix } from '../../tools/cubelab/profiles.ts';
import { checkKeyFolders, type Chunk, type NightPlan } from '../../tools/cubelab/queue.ts';
import { identityDiff, IDENTITY_FIELDS, runLab, versionWeights, type RunMeta, type RunOptions } from '../../tools/cubelab/run.ts';
import { labVersion } from '../../tools/cubelab/versions.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const CUBE = path.join(REPO, 'cubes', 'pauper-cube-180.md');
const MIX = 'Default:0.5,Reckless:0.25,Cautious:0.25';

/** A scratch "repo" whose facts cache answers this cube's lookup (engine.ts's key), so no engine boots. */
function scratch(): { env: EngineEnv; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-resume-'));
  const names = parseCube(fs.readFileSync(CUBE, 'utf8')).cards.map((c) => c.name);
  const key = createHash('sha1').update([process.env.FORGE_JAR ?? '', '', ...names].join('\n')).digest('hex').slice(0, 16);
  fs.mkdirSync(path.join(dir, 'var/cubelab/facts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'var/cubelab/facts', `${key}.json`), JSON.stringify({ cards: [] }));
  // a git repo with one commit, so the version stamp's git calls answer (versions.ts) instead of failing noisily
  const git = (...a: string[]): void => { execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'ignore' }); };
  git('init', '-q');
  git('commit', '-q', '--allow-empty', '-m', 'scratch');
  return { env: { cp: '', homes: [path.join(dir, 'home')], repo: dir }, dir };
}

function opts(out: string, x: Partial<RunOptions> = {}): RunOptions {
  return {
    cubeFile: CUBE, format: 'grid', drafts: 250, games: 1, jobs: 1, seed: 1, profiles: ['Default', 'Default'], ratingsFile: null,
    record: 0, out, builder: 'lab', gameTimeoutSec: 300, winstonCards: 90, weights: DEFAULT_WEIGHTS, ...x,
  };
}

/** What a finished earlier night leaves in a folder: its run.json (with its version) and one draft line. */
async function earlierNight(env: EngineEnv, out: string, x: Partial<RunOptions> = {}): Promise<RunMeta> {
  const r = await runLab(env, { ...opts(out, x), checkOnly: true }, () => {});
  assert.equal(fs.existsSync(out), false, 'checkOnly writes nothing, not even the folder');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'run.json'), JSON.stringify(r.meta));
  fs.writeFileSync(path.join(out, 'drafts.jsonl'), `${JSON.stringify({ seed: 1 })}\n`);
  return r.meta;
}

test('resume: the identity fields, and the profile mix is not one of them (D394)', () => {
  assert.equal((IDENTITY_FIELDS as readonly string[]).includes('profileMix'), false);
  const base = { cubeSha: 'c', format: 'grid', games: 1, profiles: ['Default', 'Default'], builder: 'lab', weights: DEFAULT_WEIGHTS, winstonCards: 90 } as unknown as RunMeta;
  assert.deepEqual(identityDiff(base, { ...base, profileMix: MIX }), []);
  assert.deepEqual(identityDiff(base, { ...base, cubeSha: 'd', games: 3 }), ['cubeSha', 'games']);
  assert.deepEqual(identityDiff(base, { ...base, explore: { share: 0.1 } } as unknown as RunMeta), ['explore']);
});

test('resume: the profile mix is in the lab version; off, the version id is the old one', () => {
  const x = { cubeShas: ['c'], ratingsFiles: [null], forgeJar: null };
  const off = labVersion(REPO, { ...x, weights: versionWeights(DEFAULT_WEIGHTS, {}) });
  assert.equal(off.id, labVersion(REPO, { ...x, weights: DEFAULT_WEIGHTS }).id, 'an unmixed run keeps its pre-D394 id');
  const pe = { share: 0.15, epsilon: 0.05, closeCall: 0.02, opening: false };
  assert.equal(labVersion(REPO, { ...x, weights: versionWeights(DEFAULT_WEIGHTS, { playExplore: pe }) }).id,
    labVersion(REPO, { ...x, weights: { ...DEFAULT_WEIGHTS, playExplore: pe } }).id, 'D358\'s id is unchanged');
  const mixed = labVersion(REPO, { ...x, weights: versionWeights(DEFAULT_WEIGHTS, { playExplore: pe, profileMix: MIX }) });
  const plainExplore = labVersion(REPO, { ...x, weights: versionWeights(DEFAULT_WEIGHTS, { playExplore: pe }) });
  assert.notEqual(mixed.id, plainExplore.id);
  assert.notEqual(mixed.weightsSha, plainExplore.weightsSha);
});

test('resume: night 4 on night 3\'s folder -- a version change, passed and logged with the flag; a cube change is refused anyway', async () => {
  const { env, dir } = scratch();
  try {
    const pe = { share: 0.15, epsilon: 0.05, closeCall: 0.02, opening: false };
    const out = path.join(dir, 'queue/normal/pauper');
    await earlierNight(env, out, { playExplore: pe });
    const before = fs.readFileSync(path.join(out, 'run.json'), 'utf8');
    const n4 = { seed: 251, playExplore: pe, profileMix: parseProfileMix(MIX) };
    // without the flag: D341's refusal, naming the field (the mix is in the weights' hash)
    await assert.rejects(() => runLab(env, { ...opts(out, n4), checkOnly: true }, () => {}), /was written by lab version .*changed: .*weightsSha.*--allow-version-change/s);
    // with it: accepted, and the change is reported; still nothing written
    const said: string[] = [];
    const r = await runLab(env, { ...opts(out, n4), allowVersionChange: true, checkOnly: true }, (s) => said.push(s));
    assert.equal(r.resumed, true);
    assert.equal(r.done, 1);
    assert.deepEqual(r.versionChange, ['weightsSha']);
    assert.equal(r.meta.profileMix, MIX);
    assert.equal(r.meta.versions?.length, 2);
    assert.deepEqual(r.meta.versions?.at(-1)?.allowedChange?.changed, ['weightsSha']);
    assert.match(said.join('\n'), /VERSION CHANGE allowed by --allow-version-change/);
    assert.equal(fs.readFileSync(path.join(out, 'run.json'), 'utf8'), before, 'checkOnly leaves run.json as it was');
    assert.equal(fs.existsSync(path.join(out, 'decks')), false);
    // the same run again once night 4 wrote its run.json: the same version, no change
    fs.writeFileSync(path.join(out, 'run.json'), JSON.stringify(r.meta));
    const again = await runLab(env, { ...opts(out, { ...n4, seed: 501 }), checkOnly: true }, () => {});
    assert.equal(again.versionChange, null);
    // night 5 drops the mix: a version change again, never an identity refusal
    await assert.rejects(() => runLab(env, { ...opts(out, { seed: 751, playExplore: pe }), checkOnly: true }, () => {}), /was written by lab version/);
    // a folder's identity is refused even with the flag, and the message names what differs
    await assert.rejects(() => runLab(env, { ...opts(out, { ...n4, games: 3 }), allowVersionChange: true, checkOnly: true }, () => {}),
      /holds a run with a different games \(D394/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('queue: checkKeyFolders checks each key folder once, by its first chunk, and lists the refusals', async () => {
  const { env, dir } = scratch();
  try {
    const root = path.join(dir, 'queue');
    await earlierNight(env, path.join(root, 'normal/pauper'));
    const chunks: Chunk[] = [
      { key: 'normal/pauper', kind: 'normal', cubes: ['pauper'], seed: 251, drafts: 250 },
      { key: 'normal/pauper', kind: 'normal', cubes: ['pauper'], seed: 501, drafts: 250 },
    ];
    const plan = { night: 2, chunks, profileMix: MIX } as unknown as NightPlan;
    const mk = (allow: boolean) => (c: Chunk): RunOptions => opts(path.join(root, c.key), { seed: c.seed, drafts: c.drafts, profileMix: parseProfileMix(MIX), ...(allow ? { allowVersionChange: true } : {}) });
    const said: string[] = [];
    const refused = await checkKeyFolders(env, plan, mk(false), (s) => said.push(s));
    assert.equal(refused.length, 1);
    assert.match(refused[0]!, /^normal\/pauper: .*was written by lab version/);
    assert.match(said.join('\n'), /key folders \(D394\): 1 checked/);
    const ok: string[] = [];
    assert.deepEqual(await checkKeyFolders(env, plan, mk(true), (s) => ok.push(s)), []);
    assert.match(ok.join('\n'), /ok {7}normal\/pauper: version change allowed \(weightsSha\), 1 draft\(s\) already there/);
    // a key with no folder yet is a new folder
    const fresh = { night: 2, chunks: [{ key: 'normal/synergy', kind: 'normal', cubes: ['pauper'], seed: 1, drafts: 250 }] } as unknown as NightPlan;
    const nf: string[] = [];
    assert.deepEqual(await checkKeyFolders(env, fresh, mk(false), (s) => nf.push(s)), []);
    assert.match(nf.join('\n'), /normal\/synergy: new folder/);
    assert.equal(fs.existsSync(path.join(root, 'normal/synergy')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
