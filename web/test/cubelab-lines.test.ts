/*
 * mtg-table — the cube lab's chunked .jsonl reader (tools/cubelab/lines.ts): what the whole-file
 * `readFileSync(file, 'utf8').split('\n')` gave, without the one string Node cannot make past 512 MiB.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { fileLines, readJsonLines } from '../../tools/cubelab/lines.ts';
import { firstBySeed, type DraftRecord } from '../../tools/cubelab/run.ts';

function withFile(text: string | Buffer, f: (file: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-lines-'));
  try {
    const file = path.join(dir, 'drafts.jsonl');
    fs.writeFileSync(file, text);
    f(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const CASES: Array<[string, string]> = [
  ['empty', ''],
  ['one newline', '\n'],
  ['complete lines', '{"seed":1}\n{"seed":2}\n'],
  ['a torn last line', '{"seed":1}\n{"seed":2}\n{"seed":3,"dr'],
  ['a complete last line with no newline', '{"seed":1}\n{"seed":2}'],
  ['CRLF', '{"seed":1}\r\n{"seed":2}\r\n\r\n{"seed":3}\r\n'],
  ['blank and whitespace lines', '\n\n  \n{"seed":1}\n\n'],
  ['multi-byte UTF-8', '{"name":"Æther Vial — ½"}\n{"name":"日本語 🃏"}\n{"name":"Lim-Dûl'],
];

test('fileLines: the same segments as readFileSync().split("\\n"), at every chunk size', () => {
  for (const [what, text] of CASES) {
    withFile(text, (file) => {
      const want = fs.readFileSync(file, 'utf8').split('\n');
      // 1 and 2 bytes cut every multi-byte character and every CRLF in two; 7 cuts lines mid-way; the default reads it whole.
      for (const chunkBytes of [1, 2, 3, 7, 64, undefined]) {
        assert.deepEqual([...fileLines(file, { chunkBytes })], want, `${what}, chunk ${chunkBytes ?? 'default'}`);
      }
    });
  }
});

test('fileLines { complete }: the lines up to the last newline, as text.slice(0, lastIndexOf("\\n") + 1).split did', () => {
  for (const [what, text] of CASES) {
    withFile(text, (file) => {
      const t = fs.readFileSync(file, 'utf8');
      const want = t.slice(0, t.lastIndexOf('\n') + 1).split('\n');
      // The old reader's split ended with the '' after the last newline; complete leaves the tail out entirely,
      // so the two agree once blanks are dropped, which every caller of { complete } does.
      for (const chunkBytes of [1, 5, undefined]) {
        assert.deepEqual([...fileLines(file, { complete: true, chunkBytes })].filter(Boolean), want.filter(Boolean), `${what}, chunk ${chunkBytes ?? 'default'}`);
      }
    });
  }
});

test('fileLines: a line longer than the chunk, and the file closed when a caller stops early', () => {
  const long = JSON.stringify({ seed: 9, names: Array.from({ length: 500 }, (_, i) => `Card ${i}`) });
  withFile(`${long}\n{"seed":10}\n`, (file) => {
    assert.deepEqual([...fileLines(file, { chunkBytes: 16 })], [long, '{"seed":10}', '']);
    const before = fs.readdirSync('/proc/self/fd').length;
    for (const l of fileLines(file, { chunkBytes: 16 })) { assert.equal(l, long); break; }
    assert.equal(fs.readdirSync('/proc/self/fd').length, before, 'break closes the descriptor');
  });
});

test('readJsonLines: the records, and a torn last line throws as the whole-file read did', () => {
  withFile('{"seed":1,"drafters":[{"name":"Lightning Bolt"}]}\r\n\n{"seed":2,"drafters":[{"name":"Lightning Bolt"}]}', (file) => {
    const recs = readJsonLines<{ seed: number; drafters: Array<{ name: string }> }>(file, { chunkBytes: 4 });
    assert.deepEqual(recs.map((r) => r.seed), [1, 2]);
    assert.equal(recs[0]!.drafters[0]!.name, 'Lightning Bolt');
  });
  withFile('{"seed":1}\n{"seed":2,"dr', (file) => {
    assert.throws(() => readJsonLines(file), SyntaxError);
    assert.deepEqual(readJsonLines<{ seed: number }>(file, { complete: true }).map((r) => r.seed), [1]);
  });
});

test('firstBySeed (run.ts recordGames): the whole-file read\'s stable sort and slice, streamed', () => {
  const rows = [5, 3, 9, 3, 1, 7, 1, 2].map((seed, i) => ({ seed, i }));
  withFile(`${rows.map((r) => JSON.stringify(r)).join('\n')}\n`, (file) => {
    const whole = (n: number): unknown[] => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as DraftRecord)
      .sort((a, b) => a.seed - b.seed).slice(0, n);
    for (const n of [0, 1, 2, 3, 4, 8, 20]) assert.deepEqual(firstBySeed(file, n), whole(n), `n = ${n}`);
  });
});
