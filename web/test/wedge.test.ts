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
 * **M5 adds a third qualifier, and the same treatment.** The six-clause rule
 * fired on an ordinary unaffordable cast: `Pay Mana Cost: {2}{W}` with OK
 * (`Auto`) disabled, nothing selectable, no ask, my priority — and an **enabled
 * `Cancel`** next to the red "Nothing to do … concede" banner, which recovered
 * the game in one click. Clause 7 is `input.buttons.cancel.enabled → not a
 * wedge`. The negative control at the bottom of this file is that exact frame,
 * and the corpus measurement below prints all three counts so the clause's
 * effect on real recordings is a number.
 *
 *   2. the stream must have gone **quiet** for {@link WEDGE_QUIET_MS}. That half
 *      is a wall-clock timer in `WedgeBanner` and cannot be mounted here (no DOM
 *      in this suite), so what is asserted instead is the property that makes it
 *      correct: **in a real recording, every frame the predicate flags is
 *      followed by another frame well inside that window**. Measured
 *      2026-09-11: the largest such gap in the whole corpus is 121 ms (58 ms as
 *      re-measured 2026-09-12, over nine recordings), because
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
import {
  WEDGE_QUIET_MS,
  wedgeSuspected,
  wedgeSuspectedPreCancelClause,
  wedgeSuspectedPreM21,
} from '../src/render/wedge.ts';
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
    let sixClause = 0;
    let qualified = 0;
    let worstGap = 0;
    const offenders: string[] = [];

    for (let i = 0; i < log.frames.length; i++) {
      const frame = log.frames[i] as Frame;
      state = reduce(state, frame);
      if (wedgeSuspectedPreM21(state)) unqualified += 1;
      if (wedgeSuspectedPreCancelClause(state)) sixClause += 1;
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
    assert.ok(qualified <= sixClause, `${name}: the Cancel clause cannot flag more than the rule it narrows`);
    process.stderr.write(
      `  ${name}: pre-M21 ${String(unqualified)} frames flagged, M21 ${String(sixClause)}, ` +
        `+cancel clause ${String(qualified)}, ` +
        `worst gap after a flagged frame ${String(worstGap)} ms (banner needs ${String(WEDGE_QUIET_MS)})\n`,
    );
  });
}

// ---------------------------------------------------------------------------
// The negative control: the frame that actually fired the banner
// ---------------------------------------------------------------------------

/**
 * Measured live in the browser, 2026-09-12, on `decks/pacho-shield.dck`: with
 * six Islands on the table I clicked `Quake, Agent of S.H.I.E.L.D.` ({2}{W}).
 * Forge answered with this input — OK labelled `Auto` and **disabled**,
 * `selectable` empty, no ask, game not over, my priority, and no further frame —
 * so all six clauses held after 2.5 s and the panel rendered
 * `class="banner banner--error" role="alert"`: *"Nothing to do. … Resync; if
 * that does not help, concede."* `buttonCancel` was enabled and labelled
 * `Cancel`, and clicking it recovered instantly.
 *
 * The board is a real one (the first snapshot of a committed recording, so the
 * seat and priority are the engine's own); only the `input` is synthesised,
 * because no committed fixture contains an unaffordable cast — the scripted seat
 * never makes that mistake and the human ones did not make it on tape.
 */
function unaffordableCast(cancelEnabled: boolean): ReturnType<typeof initialState> {
  const file = DIR + 'human-auto-42.jsonl';
  const log = parseFrameLog(readFileSync(file, 'utf8'));
  let state = initialState(log.header);
  let seat: number | null = null;
  for (const frame of log.frames) {
    state = reduce(state, frame as Frame);
    seat = state.hello?.you ?? null;
    // The first snapshot in which this seat holds priority: everything the
    // predicate reads off `board` is then the engine's, not ours.
    if (state.board !== null && seat !== null && state.board.priority === seat) break;
  }
  assert.ok(state.board !== null, 'human-auto-42.jsonl has no state frame with our priority');
  const input: Frame = {
    v: 1,
    seq: 999_999,
    t: Date.now(),
    type: 'input',
    body: {
      prompt: 'Pay Mana Cost: {2}{W}',
      focusCardId: null,
      focusCard: null,
      buttons: {
        ok: { label: 'Auto', enabled: false },
        cancel: { label: 'Cancel', enabled: cancelEnabled },
      },
      selectable: { cardIds: [], min: 0, max: 0, mode: 'none' },
      highlighted: [],
      weak: [],
      openZones: [],
    },
  } as unknown as Frame;
  return reduce(state, input);
}

test('an unaffordable cast is NOT a wedge while Cancel is enabled (M5)', () => {
  const state = unaffordableCast(true);
  assert.equal(
    wedgeSuspectedPreCancelClause(state),
    true,
    'the six-clause rule must still flag this frame, or this control is measuring nothing',
  );
  assert.equal(
    wedgeSuspected(state),
    false,
    'the board told the player to concede while an enabled `Cancel` sat next to the banner',
  );
});

test('…and a wedge with no way out is still a wedge (M5)', () => {
  // The same frame with Cancel disabled: nothing enabled, nothing selectable, no
  // ask, my priority. That is what §4.2 is about, and the clause must not have
  // turned the banner off in general.
  assert.equal(wedgeSuspected(unaffordableCast(false)), true);
});
