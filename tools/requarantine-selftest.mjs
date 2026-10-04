#!/usr/bin/env node
/*
 * mtg-table -- tools/requarantine-selftest.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * tools/requarantine.mjs on a scratch queue night (D371): two quarantined
 * recordings, one the current checker passes (the Gonti look permission the
 * old A9 failed) and one it still fails (an opponent's morph named); a stand-in
 * "old checker" that failed both on A9.  `check` counts them by kind, a dry run
 * moves nothing, `restore` moves back exactly the passing one and logs it,
 * a second `restore` is a no-op, an occupied destination is refused, and `undo`
 * puts everything back as it was.
 *
 *   node tools/requarantine-selftest.mjs
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { check, kindOf, parseCheckerOutput, restore, undo } from './requarantine.mjs';

const ROOT = 'var/requarantine-selftest';
const QUEUE = join(ROOT, 'queue');
const QUAR = join(ROOT, 'queue-quarantine-n2');
const OUT = join(ROOT, 'out');
const FIX = 'fixtures/negative/redaction';
const PASSES = 'k1/2026-10-03/games/101/g1-seat0.jsonl.gz';
const FAILS = 'k1/2026-10-03/games/102/g1-seat1.jsonl.gz';

let failures = 0;
let checks = 0;
const expect = (what, ok) => {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
  if (!ok) failures++;
};
const quiet = async (fn) => {
  const w = process.stdout.write.bind(process.stdout);
  const l = console.log;
  process.stdout.write = () => true;
  console.log = () => {};
  try { return await fn(); } finally { process.stdout.write = w; console.log = l; }
};

// The pure parts.
expect('kindOf reads the rule tag', kindOf('... (A9, D371)') === 'A9' && kindOf('... (A9)') === 'A9');
expect('kindOf names the own-hand finding',
  kindOf("the viewer's own hand card 12 has no name -- redaction is too aggressive") === 'own-hand-no-name');
const parsed = parseCheckerOutput('FAIL  a/b.jsonl.gz\n      frames=3\n      ! a/b.jsonl.gz:5: x (A9)\n      ! ... and 4 more\nPASS  c.jsonl\n');
expect('parseCheckerOutput reads verdicts and messages',
  parsed.get('a/b.jsonl.gz')?.pass === false && parsed.get('a/b.jsonl.gz')?.messages.join() === 'x (A9)'
  && parsed.get('c.jsonl')?.pass === true);

// A scratch night.
rmSync(ROOT, { recursive: true, force: true });
const put = (dir, rel, fixture) => {
  mkdirSync(join(dir, rel, '..'), { recursive: true });
  writeFileSync(join(dir, rel), gzipSync(readFileSync(join(FIX, fixture))));
};
put(QUAR, PASSES, 'a9-look-permission-under-gonti.jsonl');
put(QUAR, FAILS, 'a9-opponent-morph-named.jsonl');
writeFileSync(join(QUAR, 'failed.txt'), `${join(QUEUE, PASSES)}\n${join(QUEUE, FAILS)}\n`);
const OLD = join(ROOT, 'old-checker.mjs');
writeFileSync(OLD, "for (const f of process.argv.slice(2)) console.log(`FAIL  ${f}\\n      ! ${f}:4: face-down card 1 ... (A9)`);\n");

const base = { night: '2', quarantine: QUAR, queue: QUEUE, out: OUT, jobs: '2' };
const report = await quiet(() => check({ ...base, 'old-checker': OLD }));
expect(`check: 2 recordings, 1 now passes (${report.recordings}, ${report.nowPass})`, report.recordings === 2 && report.nowPass === 1);
expect('check: by the old kind, A9 holds both and one now passes',
  report.byKind.A9?.recordings === 2 && report.byKind.A9?.nowPass === 1 && report.byKind.A9?.stillFailKinds.A9 === 1);
expect('check moved nothing', existsSync(join(QUAR, PASSES)) && !existsSync(join(QUEUE, PASSES)));
expect('check wrote report.md', readFileSync(join(OUT, 'report.md'), 'utf8').includes('| A9 | 2 | 1 | 1 |'));

const dry = await quiet(() => restore({ ...base, dryRun: true }));
expect('restore --dry-run counts 1 and moves nothing', dry.restored === 1 && existsSync(join(QUAR, PASSES))
  && !existsSync(join(OUT, 'manifest.jsonl')));

const done = await quiet(() => restore(base));
expect('restore moved the passing recording back to the queue', done.restored === 1
  && existsSync(join(QUEUE, PASSES)) && !existsSync(join(QUAR, PASSES)));
expect('the failing one stays quarantined', existsSync(join(QUAR, FAILS)) && !existsSync(join(QUEUE, FAILS)));
const manifest = readFileSync(join(OUT, 'manifest.jsonl'), 'utf8').trim().split('\n');
expect('one manifest line for the one move', manifest.length === 1 && JSON.parse(manifest[0]).to === join(QUEUE, PASSES));
expect('failed.txt lost the restored path and kept the other',
  readFileSync(join(QUAR, 'failed.txt'), 'utf8') === `${join(QUEUE, FAILS)}\n`
  && existsSync(join(QUAR, 'failed.before-restore.txt')));
const recheck = readFileSync(join(QUAR, 'recheck.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
expect('recheck.jsonl carries the new message of the one still failing',
  recheck.length === 1 && recheck[0].rel === FAILS && recheck[0].kinds.includes('A9')
  && /in battlefield is controlled by player/.test(recheck[0].messages[0]));

const again = await quiet(() => restore(base));
expect('a second restore moves nothing', again.restored === 0 && again.skipped.length === 1);

const un = await quiet(() => undo({ manifest: join(OUT, 'manifest.jsonl') }));
expect('undo put it back into quarantine', un.undone === 1 && existsSync(join(QUAR, PASSES)) && !existsSync(join(QUEUE, PASSES)));
expect('undo put failed.txt back', readFileSync(join(QUAR, 'failed.txt'), 'utf8')
  === `${join(QUEUE, PASSES)}\n${join(QUEUE, FAILS)}\n`);

// An occupied destination is never overwritten.
put(QUEUE, PASSES, 'baseline.jsonl');
const blocked = await quiet(() => restore(base));
expect('restore refuses to overwrite a recording the queue already has',
  blocked.restored === 0 && existsSync(join(QUAR, PASSES)) && blocked.skipped[0]?.[1].includes('already'));

rmSync(ROOT, { recursive: true, force: true });
console.log(`requarantine self-test: ${checks} check(s), ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
