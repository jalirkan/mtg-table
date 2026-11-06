/*
 * mtg-table — web/test/forge-jar-path.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **config.json's `forgeJar` may start with `~/`** (D516): the committed default
 * is `~/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, so the file
 * names no one's machine, and every reader expands a LEADING `~/` to the home
 * directory and nothing else (`~user/`, a `~` inside the path and an absolute
 * path are left as they are). `FORGE_JAR` in the environment still wins (hard
 * rule 9).
 *
 * Held here: `tools/config.sh` (which `check-forge.sh`, `bridge/run.sh`,
 * `bridge/build.sh` and the gate source), run from a scratch copy beside a
 * config.json of each shape with HOME pointed at a scratch folder; and the two
 * TypeScript readers the deck tools use (`census.ts`, `deckcensus.ts`). The Java
 * reader (`Config.forgeJar()`) is proven by every engine boot that runs without
 * `FORGE_JAR`; `tools/audit-deck.mjs`, `tools/leaks/cli.ts` and
 * `tools/ml/rollout_labels.py` carry the same one-line rule.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { defaultEditionsDir } from '../../tools/cubelab/census.ts';
import { defaultScriptsZip } from '../../tools/cubelab/deckcensus.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'forge-jar-path-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

/** FORGE_JAR as tools/config.sh sets it, for a config.json whose forgeJar is `value`. */
function configSh(value: string, env: Record<string, string> = {}): string {
  const repo = mkdtempSync(join(scratch, 'repo-'));
  mkdirSync(join(repo, 'tools'));
  copyFileSync(join(REPO, 'tools', 'config.sh'), join(repo, 'tools', 'config.sh'));
  writeFileSync(join(repo, 'config.json'), JSON.stringify({ forgeJar: value }) + '\n');
  const base: Record<string, string> = { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: '/scratch-home' };
  const r = spawnSync('bash', ['-c', '. tools/config.sh && printf %s "$FORGE_JAR"'], { cwd: repo, env: { ...base, ...env }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

test('tools/config.sh: a leading ~/ in forgeJar is $HOME', () => {
  assert.equal(configSh('~/x.jar'), '/scratch-home/x.jar');
  assert.equal(configSh('~/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar'), '/scratch-home/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar');
});

test('tools/config.sh: only that form -- an absolute path, ~user and a ~ inside the path stay as written', () => {
  assert.equal(configSh('/opt/forge/x.jar'), '/opt/forge/x.jar');
  assert.equal(configSh('~other/x.jar'), '~other/x.jar');
  assert.equal(configSh('/opt/~/x.jar'), '/opt/~/x.jar');
});

test('tools/config.sh: FORGE_JAR in the environment wins over config.json (hard rule 9)', () => {
  assert.equal(configSh('~/x.jar', { FORGE_JAR: '/elsewhere/y.jar' }), '/elsewhere/y.jar');
});

test('the deck tools\' readers (census.ts, deckcensus.ts) expand a leading ~/ the same way', () => {
  const repo = mkdtempSync(join(scratch, 'ts-'));
  writeFileSync(join(repo, 'config.json'), JSON.stringify({ forgeJar: '~/forge/x.jar' }) + '\n');
  const saved = process.env.FORGE_JAR;
  delete process.env.FORGE_JAR;
  try {
    assert.equal(defaultEditionsDir(repo), join(homedir(), 'forge', 'res', 'editions'));
    assert.equal(defaultScriptsZip(repo), join(homedir(), 'forge', 'res', 'cardsfolder', 'cardsfolder.zip'));
    writeFileSync(join(repo, 'config.json'), JSON.stringify({ forgeJar: '/opt/forge/x.jar' }) + '\n');
    assert.equal(defaultEditionsDir(repo), join('/opt/forge', 'res', 'editions'));
  } finally {
    if (saved !== undefined) process.env.FORGE_JAR = saved;
  }
});
