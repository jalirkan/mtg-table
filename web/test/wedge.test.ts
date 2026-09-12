/*
 * mtg-table — web/test/wedge.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **docs/protocol.md §4.2's wedged-game-thread banner must not fire on ordinary
 * play** (amendment M21).
 *
 * The rule as M3 shipped it was four clauses — OK disabled, `selectable` empty,
 * no outstanding ask, game not over — with no qualifier at all, and an
 * independent verifier hit it twice inside the first two turns of the first real
 * browser game: once under Forge's own `Waiting for Forge AI…` prompt at turn 1
 * upkeep, once under `Yielding until end of turn`. A red "the game thread is
 * wedged" alarm on every opponent priority window is not a cosmetic defect: it
 * makes a real wedge look exactly like turn 1.
 *
 * M21 adds two qualifiers. This file pins both against the committed human-seat
 * corpus, which is the only evidence in the repo of what an actual game looks
 * like frame by frame:
 *
 *   1. the seat must hold **priority** — {@link wedgeSuspected}, measured below
 *      against the unqualified rule so the difference is a number and not a
 *      claim;
 *   2. the stream must have gone **quiet** for {@link WEDGE_QUIET_MS}. That half
 *      is a wall-clock timer in `WedgeBanner` and cannot be mounted here (no DOM
 *      in this suite), so what is asserted instead is the property that makes it
 *      correct: **in a real recording, every frame the predicate flags is
 *      followed by another frame well inside that window**. Measured
 *      2026-09-11: the largest such gap in the whole corpus is 121 ms, because
 *      Forge's own `awaitNextInput()` re-pushes the prompt every 250 ms while it
 *      thinks. If a future emitter ever leaves a seat flagged and silent for
 *      2.5 s, this test goes red and somebody looks at it — which is exactly
 *      what the banner is for.
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import type { Frame } from '../src/protocol.ts';
import { initialState, reduce } from '../src/reduce.ts';
import { WEDGE_QUIET_MS, wedgeSuspected, wedgeSuspectedPreM21 } from '../src/render/wedge.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const DIR = fileURLToPath(new URL('../../fixtures/games/', import.meta.url));

const recordings = existsSync(DIR)
  ? readdirSync(DIR)
      .filter((n) => n.startsWith('human-') && n.endsWith('.jsonl'))
      .sort()
  : [];

test('the corpus contains human-seat recordings to measure', () => {
  assert.ok(
    recordings.length > 0,
    `no fixtures/games/human-*.jsonl to check — record one with ` +
      `./bridge/run.sh mtgtable.MtgTable --transport auto --seed 42`,
  );
});

for (const name of recordings) {
  test(`${name}: §4.2's banner never fires on ordinary play (M21)`, () => {
    const log = parseFrameLog(readFileSync(DIR + name, 'utf8'));
    let state = initialState(log.header);
    let unqualified = 0;
    let qualified = 0;
    let worstGap = 0;
    const offenders: string[] = [];

    for (let i = 0; i < log.frames.length; i++) {
      const frame = log.frames[i] as Frame;
      state = reduce(state, frame);
      if (wedgeSuspectedPreM21(state)) unqualified += 1;
      if (!wedgeSuspected(state)) continue;
      qualified += 1;

      // The seat clause, stated rather than trusted: the predicate must agree
      // with the snapshot it was derived from.
      assert.equal(
        state.board?.priority,
        state.hello?.you ?? state.session?.seat ?? null,
        `${name} frame #${String(frame.seq)}: flagged without holding priority`,
      );

      const next: Frame | undefined = log.frames[i + 1];
      const gap = next === undefined ? Number.POSITIVE_INFINITY : next.t - frame.t;
      if (Number.isFinite(gap) && gap > worstGap) worstGap = gap;
      // The last frame of a session is `over`, which clears the predicate, so a
      // flagged frame always has a successor.
      if (gap >= WEDGE_QUIET_MS) {
        offenders.push(`#${String(frame.seq)} (+${String(gap)} ms)`);
      }
    }

    assert.deepEqual(
      offenders,
      [],
      `${name}: the wedge banner would have fired during ordinary play at ${offenders.join(', ')} ` +
        `— either the engine really stalled or §4.2's rule needs another qualifier`,
    );
    // Not an assertion about a number, an assertion that the qualifiers do
    // something: the unqualified rule is true on hundreds of perfectly ordinary
    // frames in every one of these games.
    assert.ok(
      unqualified > 0,
      `${name}: the pre-M21 rule fired on no frame at all, so this file is measuring nothing`,
    );
    assert.ok(qualified <= unqualified, `${name}: M21 cannot flag more than the rule it narrows`);
    process.stderr.write(
      `  ${name}: pre-M21 ${String(unqualified)} frames flagged, M21 ${String(qualified)}, ` +
        `worst gap after a flagged frame ${String(worstGap)} ms (banner needs ${String(WEDGE_QUIET_MS)})\n`,
    );
  });
}
