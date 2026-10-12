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
