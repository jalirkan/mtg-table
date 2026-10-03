/*
 * mtg-table — web/test/deck-specs.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The AI decks are REPRODUCIBLE from a spec (`decks/specs/<deck>.json`,
 * written into `decks/<deck>.dck` by `tools/build-deck.ts`). The builder needs
 * the local card library (`var/cards/cards.sqlite`, gitignored), so it cannot
 * run here; this is the hermetic half, and it needs nothing but the repo:
 *
 *   - every spec names a `.dck` that exists, is named after it, and whose
 *     `Name=`, lines (count and name, in order) and size are the spec's — so a
 *     hand edit to either side, without re-running the builder, fails here;
 *   - every line carries an `MSH` or `MSC` set code (the builder writes one on
 *     every line), and the one the spec pins when it pins one;
 *   - every `.dck` in `decks/` that is not one of the user's decks or a probe
 *     deck HAS a spec: a new AI deck typed by hand, once, is exactly what this
 *     replaced. The user's decks are `pacho-shield.dck` and, since the engine
 *     and sets (D109), `fra-rw-aggro.dck` — the user's own Reality Fracture
 *     pool, copied from their list, which no spec could write (it is FRA, and
 *     the builder takes MSH and MSC only).
 *
 * `node tools/build-deck.ts --check` is the full check (it re-resolves every
 * name against the library and diffs the file byte for byte).
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDck, totalCards } from '../../tools/card-library/deck.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SPEC_DIR = resolve(ROOT, 'decks/specs');

interface SpecLine {
  count: number;
  name: string;
  set?: string;
  why: string;
}
interface Spec {
  deck: string;
  name: string;
  colors: string;
  size: number;
  lands: number;
  cards: SpecLine[];
}

const specs = readdirSync(SPEC_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => ({ file: f, spec: JSON.parse(readFileSync(resolve(SPEC_DIR, f), 'utf8')) as Spec }));

test('deck specs: there is one per AI deck, and at least the villain deck and the three added with it', () => {
  const decks = specs.map((s) => s.spec.deck);
  for (const d of ['decks/doom-legion.dck', 'decks/hulk-family.dck', 'decks/masters-of-evil.dck', 'decks/wakanda.dck']) {
    assert.ok(decks.includes(d), `no spec writes ${d}`);
  }
});

for (const { file, spec } of specs) {
  test(`deck specs: ${file} is ${spec.deck}, line for line`, () => {
    assert.equal(basename(file, '.json'), basename(spec.deck, '.dck'), 'a spec is named after its deck');
    const deck = parseDck(readFileSync(resolve(ROOT, spec.deck), 'utf8'));
    assert.equal(deck.name, spec.name, 'Name=');
    assert.deepEqual(deck.skipped, []);
    assert.deepEqual(
      deck.entries.map((e) => [e.section, e.count, e.name]),
      spec.cards.map((c) => ['main', c.count, c.name]),
      `${spec.deck} is not what ${file} builds — run node tools/build-deck.ts`,
    );
    deck.entries.forEach((e, i) => {
      assert.ok(e.set === 'msh' || e.set === 'msc', `${e.name}: set ${String(e.set)} (every line carries MSH or MSC)`);
      const pinned = spec.cards[i]?.set;
      if (pinned !== undefined) assert.equal(e.set, pinned.toLowerCase(), `${e.name}: the spec pins ${pinned}`);
    });
    assert.equal(totalCards(deck, 'main'), spec.size);
    for (const c of spec.cards) assert.ok(c.why.trim() !== '', `${c.name} has no "why"`);
  });
}

/** The user's own decks: never written from a spec (above). */
const USER_DECKS = new Set(['pacho-shield.dck', 'fra-rw-aggro.dck']);

test('deck specs: every decks/*.dck other than the user decks and the probe decks has a spec', () => {
  const specced = new Set(specs.map((s) => basename(s.spec.deck)));
  const unspecced = readdirSync(resolve(ROOT, 'decks'))
    .filter((f) => f.endsWith('.dck') && !USER_DECKS.has(f) && !f.endsWith('-probe.dck'))
    .filter((f) => !specced.has(f));
  assert.deepEqual(unspecced, [], 'an AI deck with no decks/specs/<deck>.json — write one and build the .dck with tools/build-deck.ts');
});
