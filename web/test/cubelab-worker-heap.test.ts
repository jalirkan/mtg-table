/*
 * mtg-table — the cube lab's worker heap (tools/cubelab/engine.ts): CUBELAB_WORKER_XMX reaches the
 * worker's java argv, the default is hard rule 6's -Xmx4096m byte for byte, and the atlas alone
 * defaults its workers to a smaller heap (three OOM kills of a long phase B, 2026-10).
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ATLAS_WORKER_XMX } from '../../tools/cubelab/atlas.ts';
import { engineEnv, javaArgs, workerXmx, WORKER_XMX_DEFAULT, type EngineEnv } from '../../tools/cubelab/engine.ts';

/** Run `f` with these environment variables set (undefined: unset), then put them back. */
function withEnv(vars: Record<string, string | undefined>, f: () => void): void {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  try { f(); } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

const LAB = { CUBELAB_CP: '/cp/a:/cp/b', CUBELAB_HOMES: '/h/0.json,/h/1.json' };

/** The argv the worker pool spawned before the heap was configurable, as it was written. */
const BEFORE = ['-u', 'DISPLAY', 'java', '-Xmx4096m', '-Djava.awt.headless=true',
  '-Dio.netty.tryReflectionSetAccessible=true', '-Dfile.encoding=UTF-8',
  '-Dsentry.uncaught.handler.enabled=false', '-Dmtgtable.config=/h/0.json',
  '-cp', '/cp/a:/cp/b', 'mtgtable.cubelab.CubeLab', 'play'];

const xmxOf = (argv: string[]): string[] => argv.filter((a) => a.startsWith('-Xmx'));

test('with CUBELAB_WORKER_XMX unset, the worker argv is the old one byte for byte', () => {
  withEnv({ ...LAB, CUBELAB_WORKER_XMX: undefined }, () => {
    assert.equal(WORKER_XMX_DEFAULT, '4096m');
    assert.equal(workerXmx(), '4096m');
    const env = engineEnv('/repo');
    assert.equal(env.xmx, '4096m');
    assert.deepEqual(javaArgs(env, '/h/0.json', ['play']), BEFORE);
    // An EngineEnv built by hand (no xmx) gets the same argv.
    const bare: EngineEnv = { cp: '/cp/a:/cp/b', homes: ['/h/0.json'], repo: '/repo' };
    assert.deepEqual(javaArgs(bare, '/h/0.json', ['play']), BEFORE);
    // A copy with other homes, as every pool caller makes, keeps the heap.
    assert.deepEqual(javaArgs({ ...env, homes: env.homes.slice(0, 1) }, '/h/0.json', ['play']), BEFORE);
  });
});

test('CUBELAB_WORKER_XMX reaches the java argv, once, in the place -Xmx4096m was', () => {
  withEnv({ ...LAB, CUBELAB_WORKER_XMX: '2560m' }, () => {
    const argv = javaArgs(engineEnv('/repo'), '/h/0.json', ['play']);
    assert.deepEqual(xmxOf(argv), ['-Xmx2560m']);
    assert.deepEqual(argv, BEFORE.map((a) => (a === '-Xmx4096m' ? '-Xmx2560m' : a)));
    // The facts call and anything else that builds an argv from a bare env read it too.
    assert.deepEqual(xmxOf(javaArgs({ cp: 'x', homes: ['h'], repo: '/r' }, 'h', ['facts'])), ['-Xmx2560m']);
  });
  withEnv({ ...LAB, CUBELAB_WORKER_XMX: '3g' }, () => {
    assert.deepEqual(xmxOf(javaArgs(engineEnv('/repo'), '/h/0.json', ['play'])), ['-Xmx3g']);
  });
});

test('the atlas defaults its workers to a smaller heap; the env still wins over it', () => {
  assert.match(ATLAS_WORKER_XMX, /^[1-9][0-9]*m$/);
  assert.ok(Number.parseInt(ATLAS_WORKER_XMX, 10) < 4096, 'the atlas heap is below the lab default');
  withEnv({ ...LAB, CUBELAB_WORKER_XMX: undefined }, () => {
    assert.deepEqual(xmxOf(javaArgs(engineEnv('/repo', ATLAS_WORKER_XMX), '/h/0.json', ['play'])), [`-Xmx${ATLAS_WORKER_XMX}`]);
  });
  withEnv({ ...LAB, CUBELAB_WORKER_XMX: '4096m' }, () => {
    assert.deepEqual(xmxOf(javaArgs(engineEnv('/repo', ATLAS_WORKER_XMX), '/h/0.json', ['play'])), ['-Xmx4096m']);
  });
});

test('a value Java would not take is refused before any JVM starts', () => {
  for (const bad of ['2560', '2.5g', '-1m', '0m', '2560mb', '4096m -Dx=1']) {
    withEnv({ ...LAB, CUBELAB_WORKER_XMX: bad }, () => {
      assert.throws(() => engineEnv('/repo'), /CUBELAB_WORKER_XMX/);
    });
  }
  withEnv({ ...LAB, CUBELAB_WORKER_XMX: '' }, () => {
    assert.equal(engineEnv('/repo').xmx, '4096m', 'an empty value is unset');
  });
});
