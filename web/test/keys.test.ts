/*
 * mtg-table — web/test/keys.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The keyboard map, as pure functions** (report 10 §12, §15).
 *
 * `planKey` is where "Space presses OK" lives, and it is a `.ts` file with no
 * React and no DOM types precisely so that this file can assert it from
 * `node --test` — no jsdom, no key-event synthesis, no mounting the board. What
 * is checked here is what M3's inline handler could not be checked for at all:
 *
 *   - the four states of `Space` (sends OK / says why it did not, three ways);
 *   - `Esc`'s precedence — an open overlay, then an open `ask` (answer `null`,
 *     which §5.4 guarantees is always legal), then the engine's Cancel button;
 *   - that a **read-only** board (a replay) plans no act at all, which is the
 *     `actions === null` seam the whole client is built around;
 *   - that a key we do not bind returns `null`, so the handler never calls
 *     `preventDefault` on a browser shortcut we do not use (§12.2 rule 3);
 *   - that a focused text field takes every key, and a focused **button** takes
 *     only Space — the M3 handler dropped the whole keyboard for buttons, which
 *     meant clicking a card turned Escape off;
 *   - that every binding in the table is reachable by the key it advertises, so
 *     the `?` overlay cannot list a chord the matcher does not accept.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  KEYMAP,
  bindingFor,
  chordFor,
  isTypingTarget,
  planKey,
  type KeyContext,
  type KeyEventLike,
} from '../src/keys.ts';

/** A live seat holding priority with both engine buttons enabled, pool empty. */
const LIVE: KeyContext = {
  live: true,
  askOpen: false,
  okEnabled: true,
  cancelEnabled: true,
  haveSelectable: false,
  poolColors: [],
  overlay: 'none',
};

function ev(key: string, extra: Partial<KeyEventLike> = {}): KeyEventLike {
  return { key, ...extra };
}

// ---------------------------------------------------------------------------
// The table itself
// ---------------------------------------------------------------------------

test('every binding in the table is reachable by its own keys', () => {
  for (const binding of KEYMAP) {
    for (const key of binding.keys) {
      const hit = bindingFor(ev(key, { ctrlKey: binding.ctrl }));
      assert.ok(hit !== null, `${binding.id}: key ${JSON.stringify(key)} matches nothing`);
      // Two bindings legitimately share a key and differ only in Ctrl (`z` is
      // zoom, `Ctrl+Z` is undo; `a` is Auto Pay, `Ctrl+A` is alpha strike), so
      // what is asserted is that the modifier decides.
      assert.equal(hit.ctrl, binding.ctrl, `${binding.id}: matched the wrong modifier`);
    }
  }
});

test('ids are unique and every chord is printable', () => {
  const ids = new Set(KEYMAP.map((b) => b.id));
  assert.equal(ids.size, KEYMAP.length, 'two bindings share an id');
  for (const binding of KEYMAP) {
    assert.ok(binding.chord.length > 0, `${binding.id} has no chord for the overlay`);
    assert.ok(binding.what.length > 0, `${binding.id} does not say what it does`);
    assert.ok(binding.forge.length > 0, `${binding.id} does not cite Forge or name the divergence`);
  }
  assert.equal(chordFor('ok'), 'SPACE');
  assert.equal(chordFor('undo'), 'CTRL+Z');
});

test('Z and CTRL+Z are different bindings, and so are A and CTRL+A', () => {
  assert.equal(bindingFor(ev('z'))?.id, 'zoom');
  assert.equal(bindingFor(ev('z', { ctrlKey: true }))?.id, 'undo');
  assert.equal(bindingFor(ev('a'))?.id, 'autoPay');
  assert.equal(bindingFor(ev('a', { ctrlKey: true }))?.id, 'alphaStrike');
  // Cmd is Ctrl on a Mac keyboard, and the concede chord must work there.
  assert.equal(bindingFor(ev('q', { metaKey: true }))?.id, 'concede');
});

test('an unbound key is left alone entirely', () => {
  for (const key of ['x', 'F5', 'ArrowLeft', 'Tab', '1']) {
    assert.equal(planKey(ev(key), LIVE), null, `${key} should not be consumed`);
  }
  // Alt is never ours: Alt+S is a browser/OS menu on most platforms.
  assert.equal(planKey(ev('s', { altKey: true }), LIVE), null);
  // An IME composition is not a keystroke.
  assert.equal(planKey(ev('s', { isComposing: true }), LIVE), null);
});

// ---------------------------------------------------------------------------
// Space — the divergence the user sees most
// ---------------------------------------------------------------------------

test('Space sends buttonOk exactly when the engine has OK enabled', () => {
  assert.deepEqual(planKey(ev(' '), LIVE)?.plan, { kind: 'buttonOk' });
  // The physical-key spelling: an automation driver delivers Space as
  // `{key: "", code: "Space"}` (measured in the live page during M3).
  assert.deepEqual(planKey(ev('', { code: 'Space' }), LIVE)?.plan, { kind: 'buttonOk' });

  const dead = planKey(ev(' '), { ...LIVE, okEnabled: false });
  assert.equal(dead?.plan.kind, 'inert');

  // §4.2 — the documented hang. With cards outlined, a dead OK means "click a
  // card", and the reason says so rather than the key doing nothing.
  const discard = planKey(ev(' '), { ...LIVE, okEnabled: false, haveSelectable: true });
  assert.equal(discard?.plan.kind, 'inert');
  assert.match(
    discard?.plan.kind === 'inert' ? discard.plan.why : '',
    /card click/,
    'a dead Space at the discard step must name §4.2',
  );
});

test('a focused button keeps Space for itself, and keeps nothing else', () => {
  const onButton = { tagName: 'BUTTON' };
  // The browser activates the focused button on Space; sending buttonOk as well
  // would answer the engine twice for one press.
  assert.equal(planKey(ev(' ', { target: onButton }), LIVE), null);
  // ...but Escape, Z, S, L and H stay bound. M3 dropped all of them, so clicking
  // a card (which focuses its tile) turned the keyboard off.
  assert.deepEqual(planKey(ev('Escape', { target: onButton }), LIVE)?.plan, {
    kind: 'buttonCancel',
  });
  assert.deepEqual(planKey(ev('s', { target: onButton }), LIVE)?.plan, {
    kind: 'view',
    id: 'toggleStack',
  });
});

test('a text field takes every key, including Escape', () => {
  for (const target of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { isContentEditable: true }]) {
    assert.ok(isTypingTarget(target));
    assert.equal(planKey(ev(' ', { target }), LIVE), null);
    assert.equal(planKey(ev('Escape', { target }), LIVE), null);
  }
  assert.equal(isTypingTarget(null), false);
  assert.equal(isTypingTarget(undefined), false);
  // An event dispatched at `window` has a target with no tagName at all — the
  // shape that used to throw in the M3 handler.
  assert.equal(isTypingTarget({}), false);
});

// ---------------------------------------------------------------------------
// Escape's precedence
// ---------------------------------------------------------------------------

test('Escape closes an overlay first, then answers an ask, then presses Cancel', () => {
  assert.deepEqual(planKey(ev('Escape'), { ...LIVE, overlay: 'zoom' })?.plan, {
    kind: 'closeOverlay',
  });
  assert.deepEqual(planKey(ev('Escape'), { ...LIVE, overlay: 'hotkeys', askOpen: true })?.plan, {
    kind: 'closeOverlay',
  });
  // §5.4 — every ask is answerable with `null`, and the bridge substitutes
  // Forge's own documented default. So this is always offered.
  assert.deepEqual(planKey(ev('Escape'), { ...LIVE, askOpen: true })?.plan, { kind: 'answerNull' });
  assert.deepEqual(planKey(ev('Escape'), LIVE)?.plan, { kind: 'buttonCancel' });
  // The engine's own `enabled`, echoed. The client decides nothing.
  assert.equal(planKey(ev('Escape'), { ...LIVE, cancelEnabled: false })?.plan.kind, 'inert');
});

test('an open ask owns Space: the game thread is parked inside that call', () => {
  const plan = planKey(ev(' '), { ...LIVE, askOpen: true })?.plan;
  assert.equal(plan?.kind, 'inert');
  assert.match(plan?.kind === 'inert' ? plan.why : '', /question/);
});

// ---------------------------------------------------------------------------
// The replay seam, and concede
// ---------------------------------------------------------------------------

test('a read-only board plans no act at all — only view toggles', () => {
  const replay: KeyContext = { ...LIVE, live: false };
  for (const key of [' ', 'Escape', 'q']) {
    const plan = planKey(ev(key, { ctrlKey: key === 'q' }), replay)?.plan;
    assert.equal(plan?.kind, 'inert', `${key} must not plan an act on a replay`);
  }
  // Panels are local: a replay may open the stack, the log and the help.
  for (const [key, id] of [
    ['s', 'toggleStack'],
    ['l', 'toggleLog'],
    ['h', 'toggleHotkeys'],
    ['c', 'toggleCombat'],
    ['z', 'zoom'],
  ] as const) {
    assert.deepEqual(planKey(ev(key), replay)?.plan, { kind: 'view', id });
  }
});

test('CTRL+Q is reachable from every live state, an open ask included', () => {
  // §9 invariant 6: a question you cannot answer is still a game you can leave.
  assert.deepEqual(planKey(ev('q', { ctrlKey: true }), LIVE)?.plan, { kind: 'concede' });
  assert.deepEqual(planKey(ev('q', { ctrlKey: true }), { ...LIVE, askOpen: true })?.plan, {
    kind: 'concede',
  });
  assert.deepEqual(planKey(ev('q', { ctrlKey: true }), { ...LIVE, overlay: 'hotkeys' })?.plan, {
    kind: 'concede',
  });
});

test('a key whose milestone has not arrived says so instead of doing nothing', () => {
  for (const [key, ctrl] of [
    ['a', false],
    ['z', true],
    ['e', false],
    ['t', false],
    ['b', false],
    ['y', false],
    ['n', false],
  ] as const) {
    const resolved = planKey(ev(key, { ctrlKey: ctrl }), LIVE);
    assert.ok(resolved !== null, `${key} is in the table but was not consumed`);
    assert.equal(resolved.plan.kind, 'inert');
    assert.match(
      resolved.plan.kind === 'inert' ? resolved.plan.why : '',
      /M5|M6/,
      `${key} must name the milestone that lights it up`,
    );
  }
});

// ---------------------------------------------------------------------------
// M5 — W U B R G C, but only while the pool holds that colour
// ---------------------------------------------------------------------------

test('a floating colour takes its letter; an empty pool leaves the letter alone', () => {
  const withU: KeyContext = { ...LIVE, poolColors: ['U'] };
  assert.deepEqual(planKey(ev('u'), withU)?.plan, { kind: 'useMana', color: 'U' });
  assert.equal(planKey(ev('u'), withU)?.binding.id, 'useMana');
  // The physical spelling, like Space: a driver may send one and not the other.
  assert.deepEqual(planKey(ev('', { code: 'KeyU' }), withU)?.plan, { kind: 'useMana', color: 'U' });
  // A colour the pool does not hold says which, rather than doing nothing.
  const dead = planKey(ev('w'), withU);
  assert.equal(dead?.plan.kind, 'inert');
  assert.match(dead?.plan.kind === 'inert' ? dead.plan.why : '', /floating mana/);
});

test('C and B keep their panels unless that colour is actually floating', () => {
  // `bindingFor` is a first-match lookup and `useMana` is LAST in the table, so
  // with an empty pool these are M4's combat emphasis and M6's pass-to-before.
  assert.deepEqual(planKey(ev('c'), LIVE)?.plan, { kind: 'view', id: 'toggleCombat' });
  assert.equal(planKey(ev('b'), LIVE)?.binding.id, 'passBeforeTurn');
  // With the colour floating, the pre-pass takes the key first.
  const rich: KeyContext = { ...LIVE, poolColors: ['B', 'C'] };
  assert.deepEqual(planKey(ev('c'), rich)?.plan, { kind: 'useMana', color: 'C' });
  assert.deepEqual(planKey(ev('b'), rich)?.plan, { kind: 'useMana', color: 'B' });
  // ...and `S`, `L`, `Z` are not colours and never move.
  assert.deepEqual(planKey(ev('s'), rich)?.plan, { kind: 'view', id: 'toggleStack' });
});

test('mana keys are dead on a replay, inside an ask, and in a text field', () => {
  const withW = { ...LIVE, poolColors: ['W'] };
  assert.equal(planKey(ev('w'), { ...withW, live: false })?.plan.kind, 'inert');
  // §5 — the game thread is parked inside the ask and is listening for one
  // thing; spending mana into it would be a click into a void.
  assert.equal(planKey(ev('w'), { ...withW, askOpen: true })?.plan.kind, 'inert');
  assert.equal(planKey(ev('w', { target: { tagName: 'INPUT' } }), withW), null);
  // Ctrl+W is the browser's, not ours.
  assert.equal(planKey(ev('w', { ctrlKey: true }), withW), null);
});

test('H and ? are the same binding', () => {
  assert.deepEqual(planKey(ev('h'), LIVE)?.plan, { kind: 'view', id: 'toggleHotkeys' });
  assert.deepEqual(planKey(ev('?', { shiftKey: true }), LIVE)?.plan, {
    kind: 'view',
    id: 'toggleHotkeys',
  });
});
