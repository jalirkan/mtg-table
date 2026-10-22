/*
 * mtg-table — web/test/cubelab-atlas-redaction.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D460: the move atlas's check step passes `--empty-hand-ok` to tools/check-redaction.mjs for its
 * branch logs, through censusplay.ts's redactionCheck.  J148's 24 flagged logs were branches whose
 * opponent held no card in any frame; the flag turns that coverage failure into a WARN only where the
 * file proves the hand empty.  Here, on variants of the checker's own baseline (no engine):
 *
 *  - redactionCheck hands its flags to the checker: an opponent hand empty in every state fails
 *    without the flag and passes with it;
 *  - the flag is no blanket excuse: a full opponent card at hand count 1 fails with it.
 *
 * The checker's own controls for the flag are tools/check-redaction-selftest.mjs's.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { redactionCheck } from '../../tools/cubelab/censusplay.ts';

const REPO = path.resolve(import.meta.dirname, '../..');
const BASELINE = path.join(REPO, 'fixtures/negative/redaction/baseline.jsonl');

/** The baseline with every state's non-viewer hand replaced by `hand(stateIndex)`. */
function variant(hand: (i: number) => { count: number; cards: unknown[] }): string {
  const lines = fs.readFileSync(BASELINE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, any>);
  const seat = lines[0]!.seat as number;
  return `${lines.map((f, i) => {
    if (i === 0 || f.type !== 'state') return JSON.stringify(f);
    for (const p of f.body.players as Array<Record<string, any>>) if (p.id !== seat) p.zones.hand = hand(i);
    return JSON.stringify(f);
  }).join('\n')}\n`;
}

test('the atlas\'s redaction check: --empty-hand-ok reaches the checker, and proves before it excuses (D460)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-redaction-'));
  try {
    const emptyFile = path.join(dir, 'd1-random-o0-b0-seat0.jsonl');
    fs.writeFileSync(emptyFile, variant(() => ({ count: 0, cards: [] })));
    assert.deepEqual(redactionCheck(REPO, [emptyFile]).failed, [emptyFile], 'without the flag: "not one card was redacted" fails, as before');
    assert.deepEqual(redactionCheck(REPO, [emptyFile], 100, ['--empty-hand-ok']).failed, [], 'with it: the file proves the hand empty, a WARN');

    const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8').split('\n')[2]!) as Record<string, any>;
    const card = { ...(base.body.players as Array<Record<string, any>>).find((p) => p.zones.hand.cards[0]?.name)!.zones.hand.cards[0], id: 9001 };
    const leakFile = path.join(dir, 'd1-random-o0-b1-seat0.jsonl');
    fs.writeFileSync(leakFile, variant((i) => (i === 2 ? { count: 1, cards: [{ ...card, owner: 1, controller: 1 }] } : { count: 0, cards: [] })));
    assert.deepEqual(redactionCheck(REPO, [leakFile], 100, ['--empty-hand-ok']).failed, [leakFile], 'a full opponent card at count 1 still fails under the flag');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
