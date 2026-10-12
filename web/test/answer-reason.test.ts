/*
 * mtg-table — web/test/answer-reason.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Amendment M68 (D426): every ask kind may come back with `reason` — the
 * bridge refused the previous answer to the same question and says why.
 * `askReasonOf` is the one reader: a string when there is one, `null` on a
 * first asking, an empty string or an older bridge's absent key.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { askReasonOf } from '../src/protocol.ts';

test('M68: askReasonOf reads the refusal, and only a real one', () => {
  assert.equal(askReasonOf({ reason: 'Choose exactly 1 option (this answer chose 0).' }),
    'Choose exactly 1 option (this answer chose 0).');
  assert.equal(askReasonOf({ reason: null }), null);
  assert.equal(askReasonOf({ reason: '' }), null);
  assert.equal(askReasonOf({}), null, 'a bridge before M68 says nothing, never "refused"');
});

test('M68: on real re-asks (fixtures/adversary/m68-frames.json, the adversarial seat on the real engine), every kind says why', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const path = fileURLToPath(new URL('../../fixtures/adversary/m68-frames.json', import.meta.url));
  const chains = JSON.parse(readFileSync(path, 'utf8')) as Record<string, { frames: Array<{ type: string; body: { reason?: string | null } }> }>;
  assert.ok(Object.keys(chains).length >= 9, Object.keys(chains).join(', '));
  for (const [kind, { frames }] of Object.entries(chains)) {
    const asks = frames.filter((f) => f.type === 'ask');
    assert.equal(askReasonOf(asks[0]?.body ?? {}), null, `${kind}: a first asking carries no reason`);
    for (const again of asks.slice(1)) assert.ok(askReasonOf(again.body), `${kind}: a re-ask says why`);
  }
});
