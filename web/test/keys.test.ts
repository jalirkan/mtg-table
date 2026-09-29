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
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { VIEWS, VIEW_IDS, isCameraChoice } from '../src/arena/camera.ts';
import {
  CAMERA_KEYS,
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
  // `1` was on this list until T8 bound the digits to the arena's camera;
  // `7`–`9` are still nobody's.
  for (const key of ['x', 'F5', 'ArrowLeft', 'Tab', '7', '9']) {
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
  // **M6 emptied this list down to one.** `A` is the survivor and is not a gap:
  // Forge writes `Auto` on `InputPayMana`'s own OK button, so the honest answer
  // to "auto-pay" is "press SPACE, that IS the button" (report 11 §6.1). Every
  // other row below it now sends an act, and the tests that follow drive them.
  const resolved = planKey(ev('a'), LIVE);
  assert.ok(resolved !== null, 'a is in the table but was not consumed');
  assert.equal(resolved.plan.kind, 'inert');
  assert.match(
    resolved.plan.kind === 'inert' ? resolved.plan.why : '',
    /M5|M6/,
    'A must name the milestone that lights it up',
  );
});

// ---------------------------------------------------------------------------
// M6 — SPACE follows `input.buttons.focus`, and the six new acts
// ---------------------------------------------------------------------------

test('SPACE presses the button the engine focused, not always OK', () => {
  // §4 / report 11 §11: `updateButtons(..., focus1)` decides which label the
  // desktop activates, and that is the whole reason "Space = OK" is not a Forge
  // shortcut. No focus (and every pre-M6 recording) is M4's behaviour, OK.
  assert.deepEqual(planKey(ev(' '), LIVE)?.plan, { kind: 'buttonOk' });
  assert.deepEqual(planKey(ev(' '), { ...LIVE, focus: null })?.plan, { kind: 'buttonOk' });
  assert.deepEqual(planKey(ev(' '), { ...LIVE, focus: 'ok' })?.plan, { kind: 'buttonOk' });
  assert.deepEqual(planKey(ev(' '), { ...LIVE, focus: 'cancel' })?.plan, { kind: 'buttonCancel' });
  // The engine's own `enabled` still decides, on whichever button it focused:
  // a focused Cancel that is disabled is not a Cancel this client may press.
  const deadCancel = planKey(ev(' '), { ...LIVE, focus: 'cancel', cancelEnabled: false });
  assert.equal(deadCancel?.plan.kind, 'inert');
  assert.match(deadCancel?.plan.kind === 'inert' ? deadCancel.plan.why : '', /focused Cancel/);
  // ...and a focused Cancel does NOT make SPACE follow OK's disabled flag.
  assert.deepEqual(planKey(ev(' '), { ...LIVE, focus: 'cancel', okEnabled: false })?.plan, {
    kind: 'buttonCancel',
  });
  // The physical spelling still matches, which is the only way a browser driver
  // can press this key at all (M3 follow-up 9).
  assert.deepEqual(planKey(ev('', { code: 'Space' }), { ...LIVE, focus: 'cancel' })?.plan, {
    kind: 'buttonCancel',
  });
});

test('E, T and B are the three engine yields, with the phases report 11 §4.1 names', () => {
  assert.deepEqual(planKey(ev('e'), LIVE)?.plan, { kind: 'yieldTo', yield: 'endOfTurn' });
  // UPKEEP and not UNTAP: UNTAP has no priority pass, so a marker there could
  // never fire (Forge's own comment, InputPassPriority.java:248-255).
  //
  // **And the column is half the answer.** A marker is per-(player, phase):
  // `END_OF_TURN` on my own cell is my end step, and only the opponent's is
  // "just before my turn". Sent without it, the browser measured the marker
  // landing on the viewer's own END_OF_TURN (docs/evidence/m6-board.md).
  assert.deepEqual(planKey(ev('t'), LIVE)?.plan, {
    kind: 'yieldTo',
    yield: 'marker',
    phase: 'UPKEEP',
    turn: 'own',
  });
  assert.deepEqual(planKey(ev('b'), LIVE)?.plan, {
    kind: 'yieldTo',
    yield: 'marker',
    phase: 'END_OF_TURN',
    turn: 'opp',
  });
  assert.equal(chordFor('passEndTurn'), 'E  (CTRL+E)');
});

test('CTRL+Z is gated on the engine’s own state.undo.can', () => {
  const canUndo: KeyContext = { ...LIVE, canUndo: true };
  assert.deepEqual(planKey(ev('z', { ctrlKey: true }), canUndo)?.plan, { kind: 'undo' });
  const dead = planKey(ev('z', { ctrlKey: true }), LIVE);
  assert.equal(dead?.plan.kind, 'inert');
  assert.match(dead?.plan.kind === 'inert' ? dead.plan.why : '', /mana abilities/);
  // Bare `z` is still the zoom, which is what makes the ctrl flag load-bearing.
  assert.deepEqual(planKey(ev('z'), canUndo)?.plan, { kind: 'view', id: 'zoom' });
});

test('P passes priority and CTRL+A alpha-strikes — both plain acts', () => {
  assert.deepEqual(planKey(ev('p'), LIVE)?.plan, { kind: 'passPriority' });
  assert.deepEqual(planKey(ev('a', { ctrlKey: true }), LIVE)?.plan, { kind: 'alphaStrike' });
});

test('Y and N address the TOP stack item by its opaque handle, or say why not', () => {
  // The handle is the bridge's (`"y7"`), never Forge's own key, and the client
  // echoes it without ever rendering it (report 11 §5.2).
  const trigger: KeyContext = { ...LIVE, topYieldKey: 'y7', topYielded: null };
  assert.deepEqual(planKey(ev('y'), trigger)?.plan, {
    kind: 'setYield',
    yieldKey: 'y7',
    mode: 'yes',
  });
  assert.deepEqual(planKey(ev('n'), trigger)?.plan, {
    kind: 'setYield',
    yieldKey: 'y7',
    mode: 'no',
  });
  // Nothing on the stack the engine offers one for: say so, do not send an act
  // with a handle this client invented.
  const none = planKey(ev('y'), LIVE);
  assert.equal(none?.plan.kind, 'inert');
  assert.match(none?.plan.kind === 'inert' ? none.plan.why : '', /top of the stack/);
  // Already set: pressing it again is not a second act.
  const already = planKey(ev('y'), { ...trigger, topYielded: 'yes' });
  assert.equal(already?.plan.kind, 'inert');
  assert.match(already?.plan.kind === 'inert' ? already.plan.why : '', /already set/);
  // ...but the other answer is still a change.
  assert.deepEqual(planKey(ev('n'), { ...trigger, topYielded: 'yes' })?.plan, {
    kind: 'setYield',
    yieldKey: 'y7',
    mode: 'no',
  });
});

test('every M6 act key is inert on a replay and while an ask is outstanding', () => {
  const full: KeyContext = { ...LIVE, canUndo: true, topYieldKey: 'y3' };
  for (const [key, ctrl] of [
    ['z', true],
    ['e', false],
    ['t', false],
    ['b', false],
    ['p', false],
    ['a', true],
  ] as const) {
    const readOnly = planKey(ev(key, { ctrlKey: ctrl }), { ...full, live: false });
    assert.equal(readOnly?.plan.kind, 'inert', `${key} must send nothing on a replay`);
    assert.match(readOnly?.plan.kind === 'inert' ? readOnly.plan.why : '', /read-only/);
    // §5 — the game thread is parked inside the ask and is listening for one
    // thing; an act sent now reaches a controller nobody is reading.
    const asking = planKey(ev(key, { ctrlKey: ctrl }), { ...full, askOpen: true });
    assert.equal(asking?.plan.kind, 'inert', `${key} must send nothing inside an ask`);
    assert.match(asking?.plan.kind === 'inert' ? asking.plan.why : '', /question is outstanding/);
  }
  // Y / N are the exception, and it is Forge's: `setTriggerDecision` answers the
  // question in front of you as well as the later ones (report 11 §5.1).
  assert.deepEqual(planKey(ev('y'), { ...full, askOpen: true })?.plan, {
    kind: 'setYield',
    yieldKey: 'y3',
    mode: 'yes',
  });
  assert.equal(planKey(ev('y'), { ...full, live: false })?.plan.kind, 'inert');
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

// ---------------------------------------------------------------------------
// The other half of "one keymap": somebody has to HANDLE the row
// ---------------------------------------------------------------------------

/**
 * **Every row of the table is dispatched by at least one renderer.**
 *
 * The existing overlay test proves the `?`/`H` screen lists every chord. It
 * cannot prove anything *happens*, and M7 shipped the gap: `keys.ts` gained
 * `toggleView` and `skipCues` in E6, the overlay listed both ("V  switch between
 * the 2D board and the 3D arena") and README promised `V` "at any moment", but
 * the only handler for `toggleView` in the whole tree was `arena/Arena.tsx`.
 * On the board the plan fell through the `view` switch's `default: return`
 * **after** `event.preventDefault()` — so the key was swallowed silently, in the
 * one renderer that draws the key table.
 *
 * The scan is crude on purpose, like `hooks-order.test.ts`: `planKey` is asked
 * what each row plans, and the plan's discriminator has to appear as a `case`
 * in one of the two dispatchers. It cannot prove the branch does the right
 * thing; it can prove the branch exists, which is the defect that shipped.
 */
test('every KeyActionId is handled in at least one renderer’s dispatcher', () => {
  // `main.tsx` is the third dispatcher since the workshop: it owns the view, and
  // `W` (`openWorkshop`) is dispatched there, in the arena, ahead of the arena's
  // own handler (the arena file is left untouched).
  const sources = ['../src/render/Board.tsx', '../src/arena/Arena.tsx', '../src/main.tsx'].map((rel) => ({
    name: rel,
    src: readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'),
  }));

  // Everything on at once, so no row is planned `inert` for want of context.
  const rich: KeyContext = {
    ...LIVE,
    haveSelectable: true,
    canUndo: true,
    topYieldKey: 'y1',
    // `null` = the engine has set no auto-yield on the top item, so BOTH `Y`
    // and `N` plan a real `setYield` rather than "already set to that".
    topYielded: null,
    // T8: the arena's camera rows plan `camera` / `spectator` only where there
    // is a camera; with this on, their dispatch in Arena.tsx is checked too.
    arena: true,
    // D241: a face-up card under the pointer, so `I` plans a real `inspect`.
    inspect: { href: '#workshop?card=Doctor+Doom&view=inspect', name: 'Doctor Doom' },
  };

  const unhandled: string[] = [];
  const census: string[] = [];
  for (const binding of KEYMAP) {
    // `useMana` is the one row the table never reaches on its own: `planKey`'s
    // pre-pass takes W/U/B/R/G/C while the pool holds them, which is exactly
    // what makes `C` mean "show combat" with an empty pool.
    const ctx = binding.id === 'useMana' ? { ...rich, poolColors: ['W'] } : rich;
    const key = binding.id === 'useMana' ? 'w' : binding.keys[0]!;
    const resolved = planKey(ev(key, { ctrlKey: binding.ctrl, shiftKey: key === '?' }), ctx);
    assert.ok(resolved !== null, `${binding.id}: its own key plans nothing at all`);
    const plan = resolved.plan;
    // A `view` plan is dispatched by its id inside the `case 'view'` switch;
    // every other plan by its kind.
    // A `view` plan is dispatched by its id inside the `case 'view'` switch;
    // every other plan by its kind. Both dispatch styles this repo uses count —
    // `Board.tsx`'s nested `switch` and `Arena.tsx`'s `if (plan.id === …)`.
    const token = plan.kind === 'view' ? plan.id : plan.kind;
    const needle = `case '${token}':`;
    const where = sources
      .filter((s) => s.src.includes(needle) || s.src.includes(`=== '${token}'`))
      .map((s) => s.name);
    if (plan.kind === 'inert') {
      // A row that is inert even with everything switched on is a row whose
      // milestone has not arrived (`autoPay`). `inert` is itself dispatched.
      census.push(`${binding.id.padEnd(15)} inert — ${plan.why.slice(0, 48)}`);
      continue;
    }
    if (where.length === 0) unhandled.push(`${binding.id} → ${needle}`);
    else census.push(`${binding.id.padEnd(15)} ${needle.padEnd(24)} ${where.join(' ')}`);
    // **M7's two rows have to be live in BOTH**, because both renderers draw a
    // `V` that means "go to the other one" and `?`/`H` promises both keys
    // everywhere. This is the assertion the shipped defect needed: `V` was
    // handled in `Arena.tsx` alone and swallowed on the board.
    if (binding.id === 'toggleView' || binding.id === 'skipCues') {
      assert.equal(
        where.filter((name) => !name.endsWith('main.tsx')).length,
        2,
        `${binding.id} (${binding.chord}) is an M7 row and must be dispatched by BOTH renderers; ` +
          `only ${where.join(', ') || 'nobody'} handles it`,
      );
    }
  }

  for (const line of census) console.log(`  ${line}`);
  assert.deepEqual(
    unhandled,
    [],
    'these keymap rows are listed in the `?` overlay and dispatched by nobody — the key is ' +
      'consumed (`preventDefault` has already run) and then does nothing at all:\n  ' +
      unhandled.join('\n  '),
  );
});

// ---------------------------------------------------------------------------
// M7 Tier 2 (T8) — the arena's camera keys
// ---------------------------------------------------------------------------

const ARENA: KeyContext = { ...LIVE, arena: true };

test('1–5 choose the five views, 6 and 0 the director, O spectator — in the arena', () => {
  const expected: Record<string, string> = {
    '1': 'table',
    '2': 'shoulder',
    '3': 'oppShoulder',
    '4': 'side',
    '5': 'low',
    '6': 'director',
    '0': 'director',
  };
  for (const [key, choice] of Object.entries(expected)) {
    assert.deepEqual(planKey(ev(key), ARENA)?.plan, { kind: 'camera', choice }, `key ${key}`);
  }
  assert.deepEqual(planKey(ev('o'), ARENA)?.plan, { kind: 'spectator' });
  assert.deepEqual(planKey(ev('O', { shiftKey: true }), ARENA)?.plan, { kind: 'spectator' });
  assert.equal(chordFor('cameraView'), '1 2 3 4 5');
  assert.equal(chordFor('toggleSpectator'), 'O');
});

test('the camera keys are picture controls: legal on a replay, behind an ask, sending nothing', () => {
  for (const ctx of [
    { ...ARENA, live: false },
    { ...ARENA, askOpen: true },
    { ...ARENA, live: false, askOpen: true },
  ]) {
    assert.deepEqual(planKey(ev('4'), ctx)?.plan, { kind: 'camera', choice: 'side' });
    assert.deepEqual(planKey(ev('o'), ctx)?.plan, { kind: 'spectator' });
  }
  // A focused text field still owns its digits — a `choose_number` ask types
  // into one, and a 2 there is a two, not a camera.
  assert.equal(planKey(ev('2', { target: { tagName: 'INPUT' } }), ARENA), null);
  // Modifiers are never ours: Ctrl+1 is the browser's first tab.
  assert.equal(planKey(ev('1', { ctrlKey: true }), ARENA), null);
  assert.equal(planKey(ev('1', { altKey: true }), ARENA), null);
});

test('on the board the camera keys are bound, and say why they do nothing', () => {
  // **CLAUDE.md M4 convention 4's defect, avoided.** The board's `view` switch
  // has a silent `default:` after `preventDefault()`, so a camera row planned
  // as a `view` there would be a swallowed key. Without `arena`, the row plans
  // `inert` — which the board flashes — naming the renderer that has a camera.
  for (const key of ['1', '3', '5', '6', '0', 'o']) {
    const plan = planKey(ev(key), LIVE)?.plan;
    assert.equal(plan?.kind, 'inert', `${key} on the board`);
    assert.match(plan?.kind === 'inert' ? plan.why : '', /press V/, `${key} must point at V`);
  }
});

// ---------------------------------------------------------------------------
// The workshop's key: W, from the arena
// ---------------------------------------------------------------------------

test('W opens the workshop from the arena, says so on the board, and still spends floating white mana', () => {
  assert.deepEqual(planKey(ev('w'), ARENA)?.plan, { kind: 'view', id: 'openWorkshop' });
  // A picture key: legal on a replay and behind an ask, like the camera rows.
  assert.deepEqual(planKey(ev('w'), { ...ARENA, live: false, askOpen: true })?.plan, { kind: 'view', id: 'openWorkshop' });
  const board = planKey(ev('w'), LIVE);
  assert.equal(board?.binding.id, 'openWorkshop');
  assert.equal(board?.plan.kind, 'inert');
  assert.match(board?.plan.kind === 'inert' ? board.plan.why : '', /press V/);
  // M5's pre-pass is untouched: white mana floating on the board takes the letter.
  assert.deepEqual(planKey(ev('w'), { ...LIVE, poolColors: ['W'] })?.plan, { kind: 'useMana', color: 'W' });
  // Ctrl+W is the browser's; a text field owns its letters.
  assert.equal(planKey(ev('w', { ctrlKey: true }), ARENA), null);
  assert.equal(planKey(ev('w', { target: { tagName: 'INPUT' } }), ARENA), null);
  assert.equal(chordFor('openWorkshop'), 'W');
});

// ---------------------------------------------------------------------------
// D241 — I: inspect from the table
// ---------------------------------------------------------------------------

test('I inspects the card the arena names, says why when it names none, is inert on the board, and never acts', () => {
  const link = { href: '#workshop?card=Doctor+Doom&view=inspect', name: 'Doctor Doom' };
  assert.deepEqual(planKey(ev('i'), { ...ARENA, inspect: link })?.plan, { kind: 'inspect', ...link });
  // A picture key: legal on a replay and behind an open ask — it is navigation, and it sends nothing.
  assert.deepEqual(planKey(ev('i'), { ...ARENA, live: false, askOpen: true, inspect: link })?.plan, { kind: 'inspect', ...link });
  // The arena's planner said why not (a face-down card, a card with no figure): the key says it.
  const hidden = planKey(ev('i'), { ...ARENA, inspect: { why: 'a face-down or hidden card is never inspected' } });
  assert.deepEqual(hidden?.plan, { kind: 'inert', why: 'a face-down or hidden card is never inspected' });
  // Nothing hovered and nothing clicked.
  for (const inspect of [undefined, null]) {
    const none = planKey(ev('i'), { ...ARENA, inspect });
    assert.equal(none?.plan.kind, 'inert');
    assert.match(none?.plan.kind === 'inert' ? none.plan.why : '', /hover or click a face-up card/);
  }
  // On the board: bound, and says where it lives — even with a link in the context, which only the arena gives.
  const board = planKey(ev('i'), { ...LIVE, inspect: link });
  assert.equal(board?.binding.id, 'inspectCard');
  assert.equal(board?.plan.kind, 'inert');
  assert.match(board?.plan.kind === 'inert' ? board.plan.why : '', /press V/);
  // Ctrl+I is the browser's; a text field owns its letters; the chip prints the chord.
  assert.equal(planKey(ev('i', { ctrlKey: true }), { ...ARENA, inspect: link }), null);
  assert.equal(planKey(ev('i', { target: { tagName: 'INPUT' } }), { ...ARENA, inspect: link }), null);
  assert.equal(chordFor('inspectCard'), 'I');
  // No other row takes I.
  assert.deepEqual(KEYMAP.filter((b) => b.keys.includes('i')).map((b) => b.id), ['inspectCard']);
});

test('the I dispatcher is the arena’s: it navigates to the plan’s href and sends no act', () => {
  const arena = readFileSync(fileURLToPath(new URL('../src/arena/Arena.tsx', import.meta.url)), 'utf8');
  const at = arena.indexOf("case 'inspect':");
  assert.ok(at > 0, 'Arena.tsx has no case for the inspect plan');
  const branch = arena.slice(at, arena.indexOf('return;', at));
  assert.match(branch, /openInspect\(plan\.href\)/);
  assert.doesNotMatch(branch, /onAct|onAnswer/, 'inspect is navigation: it must send nothing');
  // The context's `inspect` comes from the one planner, fed the hovered card, else the last clicked.
  assert.match(arena, /inspect: inspectContextOf\(inspectTarget\)/);
  assert.match(arena, /inspectTargetOf\(/);
});

test('M turns the arena’s sound on and off, is a picture key, and is inert on the board (D251)', () => {
  assert.deepEqual(planKey(ev('m'), ARENA)?.plan, { kind: 'sound' });
  // Local and sends nothing: legal on a replay and behind an open ask.
  assert.deepEqual(planKey(ev('m'), { ...ARENA, live: false, askOpen: true })?.plan, { kind: 'sound' });
  // On the board: bound, and says where it lives, as the camera rows do.
  const board = planKey(ev('m'), LIVE);
  assert.equal(board?.binding.id, 'toggleSound');
  assert.equal(board?.plan.kind, 'inert');
  assert.match(board?.plan.kind === 'inert' ? board.plan.why : '', /sound[\s\S]*press V/);
  // Ctrl+M is the browser's; a text field owns its letters; the strip prints the chord.
  assert.equal(planKey(ev('m', { ctrlKey: true }), ARENA), null);
  assert.equal(planKey(ev('m', { target: { tagName: 'INPUT' } }), ARENA), null);
  assert.equal(chordFor('toggleSound'), 'M');
  assert.deepEqual(KEYMAP.filter((b) => b.keys.includes('m')).map((b) => b.id), ['toggleSound']);
  // The arena's dispatcher toggles the sound — the gesture that may start the page's audio — and sends nothing.
  const arena = readFileSync(fileURLToPath(new URL('../src/arena/Arena.tsx', import.meta.url)), 'utf8');
  const at = arena.indexOf("case 'sound':");
  assert.ok(at > 0, 'Arena.tsx has no case for the sound plan');
  const branch = arena.slice(at, arena.indexOf('return;', at));
  assert.match(branch, /toggleSound\(\)/);
  assert.doesNotMatch(branch, /onAct|onAnswer/, 'the sound key must send nothing');
});

test('the W dispatcher in main.tsx listens in the capture phase, and only where the arena is really mounted', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.tsx', import.meta.url)), 'utf8');
  // Ahead of the arena's own window listener, which has no branch for the plan.
  assert.match(main, /addEventListener\('keydown', onKey, true\)/);
  assert.match(main, /stopImmediatePropagation\(\)/);
  assert.match(main, /resolved\.plan\.id === 'openWorkshop'/);
  // Not at `?arena=off#arena`, where the BOARD is on screen: there W is the
  // board's (floating white mana, M5), and the capture-phase stop would take it.
  assert.match(main, /if \(view !== 'arena' \|\| arenaOff\) return;/);
  assert.match(main, /const arenaOff = useMemo\(\(\) => arenaFlagsFromQuery\(\)\.off, \[\]\);/);
  assert.match(main, /useWorkshopKey\(view, setView, arenaOff\);/);
});

// ---------------------------------------------------------------------------
// D255/D256 — N: the arena's caption strip
// ---------------------------------------------------------------------------

test('N toggles the arena’s caption, says so on a read-only board, and stays Forge’s always-no on a live board', () => {
  const caption = { kind: 'view', id: 'toggleCaption' };
  assert.deepEqual(planKey(ev('n'), ARENA)?.plan, caption);
  assert.equal(planKey(ev('n'), ARENA)?.binding.id, 'toggleCaption');
  // A picture key: legal on a replay and behind an ask, like the camera rows.
  assert.deepEqual(planKey(ev('n'), { ...ARENA, live: false, askOpen: true })?.plan, caption);
  // The arena draws no auto-yield control (N there said "a board control — press V"),
  // so N is the caption's even with an ability on top of the stack.
  assert.deepEqual(planKey(ev('n'), { ...ARENA, topYieldKey: 'y7', topYielded: null })?.plan, caption);
  assert.deepEqual(planKey(ev('N', { shiftKey: true }), ARENA)?.plan, caption);
  // A read-only board: always-no could only say "read-only"; the caption row says where it lives.
  const replayBoard = planKey(ev('n'), { ...LIVE, live: false, topYieldKey: 'y7' });
  assert.equal(replayBoard?.binding.id, 'toggleCaption');
  assert.equal(replayBoard?.plan.kind, 'inert');
  assert.match(replayBoard?.plan.kind === 'inert' ? replayBoard.plan.why : '', /caption.*press V/);
  // A live board keeps Forge's N, untouched (M6).
  assert.deepEqual(planKey(ev('n'), { ...LIVE, topYieldKey: 'y7', topYielded: null })?.plan, {
    kind: 'setYield',
    yieldKey: 'y7',
    mode: 'no',
  });
  assert.equal(planKey(ev('n'), LIVE)?.binding.id, 'alwaysNo');
  // Ctrl+N is the browser's; a text field owns its letters; the physical spelling works.
  assert.equal(planKey(ev('n', { ctrlKey: true }), ARENA), null);
  assert.equal(planKey(ev('n', { metaKey: true }), ARENA), null);
  assert.equal(planKey(ev('n', { altKey: true }), ARENA), null);
  assert.equal(planKey(ev('n', { target: { tagName: 'INPUT' } }), ARENA), null);
  assert.deepEqual(planKey(ev('', { code: 'KeyN' }), ARENA)?.plan, caption);
  assert.equal(chordFor('toggleCaption'), 'N');
  // Two rows share N, always-no first: `bindingFor` stays Forge's, and the caption
  // row is reached only through `planKey`'s pre-pass.
  assert.deepEqual(KEYMAP.filter((b) => b.keys.includes('n')).map((b) => b.id), ['alwaysNo', 'toggleCaption']);
  assert.equal(bindingFor(ev('n'))?.id, 'alwaysNo');
});

test('the N dispatcher is the arena’s: it flips the strip and sends no act', () => {
  const arena = readFileSync(fileURLToPath(new URL('../src/arena/Arena.tsx', import.meta.url)), 'utf8');
  const at = arena.indexOf("plan.id === 'toggleCaption'");
  assert.ok(at > 0, 'Arena.tsx has no branch for the caption plan');
  const branch = arena.slice(at, arena.indexOf('} else', at));
  assert.match(branch, /toggleCaption\(\)/);
  assert.doesNotMatch(branch, /onAct|onAnswer/, 'the caption is a picture control: it must send nothing');
});

test('CAMERA_KEYS spells camera.ts’s views, key for key (keys.ts may not import arena/)', () => {
  // D49: keys.ts is on the 2D path and the arena chunk stays lazy, so the list
  // is written twice — and this is what keeps the two copies one list.
  for (const view of VIEWS) {
    assert.equal(CAMERA_KEYS[view.key], view.id, `key ${view.key}`);
  }
  assert.deepEqual(
    Object.values(CAMERA_KEYS).filter((choice) => choice !== 'director').sort(),
    [...VIEW_IDS].sort(),
  );
  for (const choice of Object.values(CAMERA_KEYS)) assert.ok(isCameraChoice(choice), choice);
  const row = KEYMAP.find((b) => b.id === 'cameraView');
  assert.ok(row !== undefined);
  assert.deepEqual([...row.keys], VIEWS.map((view) => view.key));
  // The overlay says which views are spectator-only; that sentence is a claim
  // about `seatSafe`, so hold it to the flag.
  const spectatorOnly = VIEWS.filter((view) => !view.seatSafe).map((view) => view.key);
  assert.match(row.what, new RegExp(`${spectatorOnly.join(' and ')} are for spectating`));

  const source = readFileSync(fileURLToPath(new URL('../src/keys.ts', import.meta.url)), 'utf8');
  assert.ok(
    !/from '\.\/arena\//.test(source),
    'keys.ts imports from arena/ — it is on the 2D path, and D49 keeps three out of the entry chunk',
  );
});
