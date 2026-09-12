/*
 * mtg-table — web/test/board-m6.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M6 on the board**: comfort, as *engine features rendered*.
 *
 * Each test here pins one of the five new wire fields to the control it drives,
 * and — where the component is hook-free — drives the control for real and
 * asserts the `act` body it produces, which is the half a markup assertion
 * cannot see. `PhaseStrip` is that component: it takes no context and no state,
 * deliberately, because the dots are the one M6 control whose act has three
 * fields to get wrong (`phase`, `turn`, **and the polarity of `stop`**).
 *
 * The harness is `render.test.tsx`'s and `board-m5.test.tsx`'s:
 * `renderToStaticMarkup`, no jsdom (M4 follow-up 4 says why).
 *
 * The hidden-information assertion in here is the `yieldKey` one. Forge's own
 * key is `CardView.toString() + ": " + …` — a card name, its zone and its id —
 * so the bridge ships an opaque handle and **the client must never render it**
 * (report 11 §5.2). That is asserted over the whole rendered page, not over the
 * stack panel, because a `title` or an `aria-label` leaks exactly as well as a
 * label does.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { EMPTY_ART_INDEX } from '../src/art.ts';
import type {
  ActBody,
  GameStateBody,
  PhaseStops,
  SetYieldMode,
  YieldKind,
} from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { Board, type BoardActions } from '../src/render/Board.tsx';
import { LogDrawer } from '../src/render/LogDrawer.tsx';
import { PhaseStrip, type StopTurn } from '../src/render/PhaseStrip.tsx';
import { parseFrameLog } from '../src/transport/replay.ts';

const SYNTHETIC = fileURLToPath(
  new URL('../../fixtures/synthetic/sample-handwritten.jsonl', import.meta.url),
);

const NO_ACTIONS: BoardActions = {
  clickCard: () => undefined,
  clickPlayer: () => undefined,
  buttonOk: () => undefined,
  buttonCancel: () => undefined,
  useMana: () => undefined,
  concede: () => undefined,
  answer: () => undefined,
  undo: () => undefined,
  passPriority: () => undefined,
  alphaStrike: () => undefined,
  yieldTo: () => undefined,
  setYield: () => undefined,
  setPhaseStop: () => undefined,
  newGame: () => undefined,
};

function live(state: ClientState, actions: BoardActions = NO_ACTIONS): string {
  return renderToStaticMarkup(<Board state={state} art={EMPTY_ART_INDEX} actions={actions} />);
}

function replay(state: ClientState): string {
  return renderToStaticMarkup(<Board state={state} art={EMPTY_ART_INDEX} />);
}

/**
 * The last folded state of the synthetic fixture that has cards on the stack, a
 * live game and no outstanding question.
 *
 * `state.gameOver === null` is load-bearing and was a bug in this helper's first
 * draft: `board` survives every non-`state` frame, so without it the "last
 * qualifying state" was the one *after* the fixture's `over` — a finished game,
 * where the board correctly refuses to send an act and every M6 control is
 * inert. The same shape would have made four tests here pass vacuously.
 */
function stateWithStack(): ClientState {
  const log = parseFrameLog(readFileSync(SYNTHETIC, 'utf8'));
  let state = initialState(log.header);
  let best: ClientState | null = null;
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if ((state.board?.stack.length ?? 0) > 0 && state.ask === null && state.gameOver === null) {
      best = state;
    }
  }
  if (best === null) throw new Error('the synthetic fixture has no live state frame with a stack');
  return best;
}

/**
 * That state with **every M6 field stripped** — a recording made before
 * 2026-09-12, which is what fourteen of the fifteen committed fixtures are.
 *
 * It is built by deletion rather than by picking an old fixture on purpose: the
 * synthetic fixture was re-recorded the day M6 landed and grew the fields, and a
 * test that depended on a file *not* having them broke the same afternoon.
 */
function withoutM6(state: ClientState): ClientState {
  const board = structuredClone(state.board!) as GameStateBody;
  for (const player of board.players) delete player.phaseStops;
  delete board.yield;
  delete board.undo;
  for (const item of board.stack) {
    delete item.yieldKey;
    delete item.isAbility;
    delete item.isOptionalTrigger;
    delete item.yielded;
  }
  return { ...state, board };
}

/** That state with the M6 fields a live bridge writes, patched in. */
function withM6(
  state: ClientState,
  patch: {
    stops?: PhaseStops;
    yielding?: GameStateBody['yield'];
    undo?: GameStateBody['undo'];
    stack?: Array<{ yieldKey: string; isAbility: boolean; isOptionalTrigger?: boolean; yielded?: 'yes' | 'no' | null }>;
  },
): ClientState {
  const board = structuredClone(state.board!) as GameStateBody;
  const you = state.hello?.you ?? 0;
  if (patch.stops !== undefined) {
    for (const player of board.players) {
      if (player.id === you) player.phaseStops = patch.stops;
    }
  }
  if (patch.yielding !== undefined) board.yield = patch.yielding;
  if (patch.undo !== undefined) board.undo = patch.undo;
  if (patch.stack !== undefined) {
    patch.stack.forEach((fields, i) => {
      const item = board.stack[i];
      if (item === undefined) return;
      item.yieldKey = fields.yieldKey;
      item.isAbility = fields.isAbility;
      item.isOptionalTrigger = fields.isOptionalTrigger ?? false;
      item.yielded = fields.yielded ?? null;
    });
  }
  return { ...state, board };
}

interface ElementLike {
  props?: Record<string, unknown>;
}

/**
 * Walk a React element tree without a renderer, **invoking function components
 * as it goes**. Only safe for hook-free components — which `PhaseStrip` and its
 * `StopDot` are, deliberately: the strip holds no state of its own (**D31**),
 * so there is nothing for a hook to hold.
 */
function walk(node: unknown, visit: (el: ElementLike) => void): void {
  if (node === null || node === undefined || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  const el = node as ElementLike & { type?: unknown };
  if (el.props === undefined) return;
  visit(el);
  if (typeof el.type === 'function') {
    // A component element's children do not exist until something renders it.
    walk((el.type as (props: unknown) => unknown)(el.props), visit);
    return;
  }
  walk(el.props.children, visit);
}

/** The `<button …>` tag of the first element carrying this attribute pair. */
function buttonTag(html: string, attribute: string): string {
  const at = html.indexOf(attribute);
  if (at < 0) return '';
  const open = html.lastIndexOf('<button', at);
  const close = html.indexOf('>', at);
  return open < 0 || close < 0 ? '' : html.slice(open, close + 1);
}

// ---------------------------------------------------------------------------
// 1. Phase stops — the dots are toggles, and the act has three fields
// ---------------------------------------------------------------------------

/** Every dot the strip drew, keyed `<PHASE>:<turn>`, with its click handler. */
function dotsOf(
  board: GameStateBody,
  you: number,
  onSetPhaseStop: ((phase: string, turn: StopTurn, stop: boolean) => void) | null,
): Map<string, ElementLike> {
  // `PhaseStrip` has no hooks, so the element it returns can be walked and its
  // handlers invoked — a real click, with no DOM.
  const element = PhaseStrip({ board, you, onSetPhaseStop });
  const dots = new Map<string, ElementLike>();
  walk(element, (el) => {
    const phase = el.props?.['data-phase'];
    const turn = el.props?.['data-turn'];
    if (typeof phase === 'string' && typeof turn === 'string') dots.set(`${phase}:${turn}`, el);
  });
  return dots;
}

test('a phase dot sends setPhaseStop with the phase, the column and the INVERSE of its state', () => {
  const base = stateWithStack();
  const you = base.hello?.you ?? 0;
  const stops: PhaseStops = { own: ['MAIN1', 'MAIN2'], opp: ['COMBAT_DECLARE_ATTACKERS'] };
  const state = withM6(base, { stops });

  const sent: ActBody[] = [];
  const dots = dotsOf(state.board!, you, (phase, turn, stop) => {
    sent.push({ action: 'setPhaseStop', phase, turn, stop });
  });

  // Twelve phases have a stop preference; UNTAP has none at all, in either
  // column (`CMatchUI.actuateMatchPreferences` loops p = 1 … 12).
  expect(dots.size).toBe(24);
  expect(dots.has('UNTAP:own')).toBe(false);
  expect(dots.has('UNTAP:opp')).toBe(false);

  // A cell that is ON asks to be turned off, and vice versa. Getting this
  // backwards is a whole evening of "the engine ignores my stops".
  (dots.get('MAIN1:own')?.props?.onClick as () => void)();
  (dots.get('DRAW:own')?.props?.onClick as () => void)();
  (dots.get('COMBAT_DECLARE_ATTACKERS:opp')?.props?.onClick as () => void)();
  (dots.get('END_OF_TURN:opp')?.props?.onClick as () => void)();

  expect(sent).toEqual([
    { action: 'setPhaseStop', phase: 'MAIN1', turn: 'own', stop: false },
    { action: 'setPhaseStop', phase: 'DRAW', turn: 'own', stop: true },
    { action: 'setPhaseStop', phase: 'COMBAT_DECLARE_ATTACKERS', turn: 'opp', stop: false },
    { action: 'setPhaseStop', phase: 'END_OF_TURN', turn: 'opp', stop: true },
  ]);

  // And the two columns are read from the two halves of ONE map: `own` is this
  // seat's own turns, `opp` the other's (the promoted §3.3 shape).
  expect(dots.get('MAIN1:own')?.props?.['data-stop']).toBe('on');
  expect(dots.get('MAIN1:opp')?.props?.['data-stop']).toBe('off');
  expect(dots.get('COMBAT_DECLARE_ATTACKERS:opp')?.props?.['data-stop']).toBe('on');
});

test('the strip renders from players[].phaseStops and keeps no stop state of its own', () => {
  const base = stateWithStack();
  const html = live(withM6(base, { stops: { own: ['UPKEEP'], opp: [] } }));
  // `UPKEEP` is NOT one of Forge's defaults, so seeing it filled is proof the
  // wire is what is being drawn (**D31** — the client computes no stop).
  expect(html).toMatch(/data-phase="UPKEEP" data-turn="own" data-stop="on"/);
  expect(html).toMatch(/data-phase="MAIN1" data-turn="own" data-stop="off"/);
  expect(html).toContain('act: setPhaseStop');
  // The M4 legend is gone, and so is the toggle that had no engine behind it
  // (report 11 §0: "There is no hold priority in Forge").
  expect(html).not.toContain('read-only until M6');
  expect(html).not.toContain('Hold priority');
});

test('a stream with no phaseStops still draws dots, disabled, and says they are defaults', () => {
  // Every recording made before 2026-09-12 is this case, and `render.test.tsx`
  // folds fifteen of them. `phaseStopsOf` is the one place the two are told
  // apart: absent is "this bridge sends no stops", not "stops nowhere".
  const state = withoutM6(stateWithStack());
  expect(state.board!.players.every((p) => p.phaseStops === undefined)).toBe(true);
  const html = live(state);
  expect(html).toContain('Forge defaults (this stream sends no stops)');
  expect(html).toContain('data-act="setPhaseStop"');
  expect(buttonTag(html, 'data-act="setPhaseStop"'), 'a stop dot is live with no phaseStops on the wire').toContain('disabled');
  // ...and Forge's own defaults are what is drawn (MAIN1 on your turn).
  expect(html).toMatch(/data-phase="MAIN1" data-turn="own" data-stop="on"/);
});

test('a replay draws the dots and sends nothing, like every other affordance', () => {
  const state = withM6(stateWithStack(), { stops: { own: ['MAIN1'], opp: [] } });
  const html = replay(state);
  expect(html).toContain('Read-only');
  for (const act of ['setPhaseStop', 'yieldTo', 'undo', 'clickCard']) {
    if (!html.includes(`data-act="${act}"`)) continue;
    expect(buttonTag(html, `data-act="${act}"`), `${act} is live on a replay`).toContain('disabled');
  }
});

// ---------------------------------------------------------------------------
// 2. Pass-to — three buttons, one act, and state.yield drawn where it happens
// ---------------------------------------------------------------------------

test('the three pass-to buttons carry the kinds and phases report 11 §4.1 names', () => {
  const html = live(stateWithStack());
  expect(html).toMatch(/data-act="yieldTo" data-yield="endOfTurn"/);
  // UPKEEP for "my next turn" — UNTAP has no priority pass, so a marker there
  // could never fire; END_OF_TURN for "before my turn", the opponent's end step.
  // ...and the marker's COLUMN, which is the half a phase name cannot carry:
  // `END_OF_TURN` on my own cell is my end step, not the opponent's.
  expect(html).toMatch(/data-act="yieldTo" data-yield="marker" data-phase="UPKEEP" data-turn="own"/);
  expect(html).toMatch(
    /data-act="yieldTo" data-yield="marker" data-phase="END_OF_TURN" data-turn="opp"/,
  );
  expect(html).toContain('data-act="passPriority"');
  // There is no cancel-a-yield act: the engine's own Cancel is the way out.
  expect(html).not.toContain('cancelYield');
});

test('an active yield renders, points at the engine’s Cancel, and marks the phase cell', () => {
  const base = stateWithStack();
  const you = base.hello?.you ?? 0;
  const marker = withM6(base, {
    yielding: { kind: 'marker', playerId: you, phase: 'UPKEEP' },
  });
  const html = live(marker);
  expect(html).toContain('data-yield="marker"');
  expect(html).toContain('until UPKEEP');
  expect(html).toContain('Cancel');
  expect(html).toContain('there is no separate act for it');
  // The marker is drawn on the cell the engine named, and nowhere else.
  expect(html).toContain('phase--marked');
  expect(html).toMatch(/data-phase="UPKEEP"[^>]*>[\s\S]{0,400}?phase__marker/);

  // While one runs, the three buttons are quiet — Cancel is the control.
  for (const kind of ['endOfTurn', 'marker']) {
    expect(buttonTag(html, `data-yield="${kind}"`)).toContain('disabled');
  }

  // The other two kinds say what they are, in the engine's own three cases.
  expect(live(withM6(base, { yielding: { kind: 'endOfTurn', playerId: you, phase: null } }))).toContain(
    'until the end of this turn',
  );
  expect(live(withM6(base, { yielding: { kind: 'stack', playerId: you, phase: null } }))).toContain(
    'until the stack clears',
  );
  // No yield: no line, no marked cell.
  const quiet = live(withM6(base, { yielding: null }));
  expect(quiet).not.toContain('phase--marked');
  expect(quiet).not.toContain('Yielding');
});

// ---------------------------------------------------------------------------
// 3. Auto-yield — the handle goes on the wire and never on the page
// ---------------------------------------------------------------------------

test('a stack ability offers Y/N, shows what it is set to, and NEVER renders the yieldKey', () => {
  const base = stateWithStack();
  const state = withM6(base, {
    stack: [
      { yieldKey: 'y1', isAbility: false },
      { yieldKey: 'y2', isAbility: true, isOptionalTrigger: true, yielded: 'yes' },
    ],
  });
  const html = live(state);

  // The engine's two guards decide the control exists: an ability, with a key.
  // A spell (`isAbility: false`) gets no buttons at all.
  expect(html).toContain('data-act="setYield"');
  expect(html).toContain('Always yes');
  expect(html).toContain('Always no');
  expect(html).toContain('always yes'); // the `yielded` chip
  // Pressing the mode that is already set clears it, rather than sending it
  // twice — the same button, and the client keeps no yield state of its own.
  expect(html).toMatch(/data-act="setYield" data-mode="clear"/);
  expect(html).toMatch(/data-act="setYield" data-mode="no"/);

  // **The handle is never rendered** (report 11 §5.2): not as text, not in a
  // title, not in an aria-label, not as a React key that reached the DOM.
  expect(html).not.toContain('y1');
  expect(html).not.toContain('y2');

  // Only the item the engine called an ability grew the control.
  const controls = html.match(/data-act="setYield"/g) ?? [];
  expect(controls.length).toBe(2); // yes + no, on one item

  // `Y` / `N` act on the TOP item, which is Forge's own rule
  // (`getGameView().peekStack()`), so only the top row prints the chords.
  expect(html).toContain('>Y</span>');
  expect(html).toContain('>N</span>');
});

test('an ability with no key, and a replay, get no auto-yield control', () => {
  const base = stateWithStack();
  // `isAbility` with an empty key is exactly the case Forge's own shortcut
  // skips (`!key.isEmpty()`), and the bridge sends `null` for it.
  const noKey = withM6(withoutM6(base), { stack: [{ yieldKey: '', isAbility: true }] });
  expect(live(noKey)).not.toContain('data-act="setYield"');

  const yielded = withM6(withoutM6(base), {
    stack: [{ yieldKey: 'y9', isAbility: true, isOptionalTrigger: true }],
  });
  const readOnly = replay(yielded);
  expect(readOnly).toContain('data-act="setYield"');
  expect(buttonTag(readOnly, 'data-act="setYield"')).toContain('disabled');
  expect(readOnly).not.toContain('y9');
});

// ---------------------------------------------------------------------------
// 4. Undo — the engine's own gate, and its own depth
// ---------------------------------------------------------------------------

test('Undo is enabled from state.undo.can and labelled with the depth', () => {
  const base = stateWithStack();
  const can = live(withM6(base, { undo: { can: true, depth: 2 } }));
  expect(buttonTag(can, 'data-act="undo"')).toContain('data-undo-depth="2"');
  expect(buttonTag(can, 'data-act="undo"')).not.toContain('disabled');
  expect(can).toContain('Undo (2)');
  // The title says what is actually undoable. A button that promises more than
  // the engine does is worse than no button (report 11 §7.1).
  expect(can).toContain('MANA abilities');
  const cannot = live(withM6(base, { undo: { can: false, depth: 0 } }));
  expect(buttonTag(cannot, 'data-act="undo"')).toContain('disabled');
  // A pre-M6 stream has no `state.undo` at all, and that reads as "cannot".
  const absent = live(withoutM6(base));
  expect(absent).toContain('data-act="undo"');
  expect(buttonTag(absent, 'data-act="undo"')).toContain('disabled');
});

// ---------------------------------------------------------------------------
// 5. New Game — only after `over`, and it says what a new game costs
// ---------------------------------------------------------------------------

function over(state: ClientState, matchOver: boolean): ClientState {
  return { ...state, gameOver: { winner: 0, reason: 'Life', matchOver } };
}

test('New Game and Restart appear only after over, with the two nextGameDecisions', () => {
  const base = stateWithStack();
  expect(live(base)).not.toContain('data-act="newGame"');

  const midMatch = live(over(base, false));
  expect(midMatch).toMatch(/data-act="newGame" data-mode="continue"/);
  expect(midMatch).toMatch(/data-act="newGame" data-mode="restart"/);
  expect(midMatch).toContain('every card id the board holds is dropped');
  // `continue` is live while the match is not over...
  expect(buttonTag(midMatch, 'data-mode="continue"')).not.toContain('disabled');

  // ...and quiet once it is, because there is no next game to continue to.
  // `matchOver` is a typed field (§7), never a reading of the result text.
  const matchDone = live(over(base, true));
  expect(buttonTag(matchDone, 'data-mode="continue"')).toContain('disabled');
  expect(buttonTag(matchDone, 'data-mode="restart"')).not.toContain('disabled');

  // A replay never offers either: there is no server to send an act to.
  expect(replay(over(base, false))).not.toContain('data-act="newGame"');
});

test('New Game is disabled, and says why, when the socket is not open', () => {
  // The M6 verification fix. The row appears at `over`, which is the one moment
  // in a session when the bridge may already have gone -- the found defect was a
  // 30 s fuse in MtgTable that closed the socket under a connected client, and
  // the browser half was a row that stayed enabled and answered a click with
  // "Not connected -- act was not sent". `connected` is the wire's state, never
  // game state, and NOTHING else on the board reads it.
  const finished = over(stateWithStack(), false);
  const offline = renderToStaticMarkup(
    <Board state={finished} art={EMPTY_ART_INDEX} actions={NO_ACTIONS} connected={false} />,
  );
  expect(buttonTag(offline, 'data-mode="continue"')).toContain('disabled');
  expect(buttonTag(offline, 'data-mode="restart"')).toContain('disabled');
  // A disabled control that does not say why is the dead end, not the fix.
  expect(offline).toContain('data-newgame="offline"');
  expect(offline).toContain('The bridge is not connected.');
  // ...and neither button pretends to be the primary one any more.
  expect(buttonTag(offline, 'data-mode="continue"')).not.toContain('btn--primary');
  expect(buttonTag(offline, 'data-mode="restart"')).not.toContain('btn--primary');

  // `true` and the default (`null`, a replay or a test that says nothing) are
  // both the live row.
  for (const connected of [true, null]) {
    const html = renderToStaticMarkup(
      <Board state={finished} art={EMPTY_ART_INDEX} actions={NO_ACTIONS} connected={connected} />,
    );
    expect(buttonTag(html, 'data-mode="continue"')).not.toContain('disabled');
    expect(buttonTag(html, 'data-mode="restart"')).not.toContain('disabled');
    expect(html).not.toContain('data-newgame="offline"');
  }
});

test('the game number reaches the panel once there is more than one game', () => {
  // The synthetic fixture is game 1 of a three-game match and says so on the
  // wire (amendment M41 — its own `over` carries `matchOver: false`).
  const base = over(stateWithStack(), false);
  expect(live(base)).toContain('Game 1 of 3');

  // A ONE-GAME session carries neither key — the bridge omits the pair for
  // `--games 1`, which is what every committed engine recording is — and the
  // row then prints no pill at all: "Game 1" on a lone game is chrome nobody
  // asked for.
  const lone: ClientState = {
    ...base,
    gameNumber: 1,
    hello: { ...base.hello!, gameNumber: undefined, gameCount: undefined },
  };
  expect(live(lone)).not.toContain('pill--game');

  // The client's own fallback for the recordings that predate M41: with no
  // `gameNumber` on the handshake, the reducer's count of distinct `gameId`s is
  // what shows — and it cannot say "of 3", which is why M41 exists.
  const preM41: ClientState = { ...lone, gameNumber: 2 };
  expect(live(preM41)).toContain('Game 2');
  expect(live(preM41)).not.toContain('of 3');

  // ...and the bridge's own numbers win over that count.
  const counted: ClientState = {
    ...preM41,
    gameNumber: 1,
    hello: { ...base.hello!, gameNumber: 2, gameCount: 3 },
  };
  expect(live(counted)).toContain('Game 2 of 3');
});

// ---------------------------------------------------------------------------
// 6. Toasts and the turn flash
// ---------------------------------------------------------------------------

test('only warn and error are toasts; "Your turn" is a flash over the table', () => {
  const state = stateWithStack();
  const withNotices: ClientState = {
    ...state,
    notices: [
      { seq: 10, t: 1, level: 'info', title: 'Your turn', text: '' },
      { seq: 11, t: 2, level: 'warn', title: 'Not selectable', text: 'card 21 cannot be selected now' },
      { seq: 12, t: 3, level: 'error', title: 'UNIMPL', text: 'something the bridge cannot do' },
    ],
  };
  const html = live(withNotices);
  // The engine's own text, verbatim, for the two levels that matter.
  expect(html).toContain('card 21 cannot be selected now');
  expect(html).toContain('something the bridge cannot do');
  expect(html).toContain('toast--warn');
  expect(html).toContain('toast--error');
  // 952 of the corpus's notices are this one line; it is not a toast any more.
  expect(html).not.toContain('toast--turn');
  expect(html).not.toContain('toast--info');
  // ...but it is not *lost*: the log drawer lists every notice, unfiltered,
  // which is what keeps "a toast is never the only copy" true (§6). The board's
  // drawer is closed by default, so this asserts the drawer itself.
  const drawer = renderToStaticMarkup(
    <LogDrawer
      state={withNotices}
      board={state.board}
      clientNotices={[]}
      open
      onToggle={() => undefined}
    />,
  );
  expect(drawer).toContain('Your turn');
  expect(drawer).toContain('Not selectable');

  // The flash is drawn from the SNAPSHOT — `state.priority` is this seat — and
  // not from the notice, so it is a fact and not a string match.
  const board = structuredClone(state.board!) as GameStateBody;
  board.priority = state.hello?.you ?? 0;
  expect(live({ ...withNotices, board, ask: null })).toContain('turnflash');
  board.priority = 1 - (state.hello?.you ?? 0);
  expect(live({ ...withNotices, board, ask: null })).not.toContain('turnflash');
});

// ---------------------------------------------------------------------------
// 7. The keyboard's M6 rows are all in the `?` overlay
// ---------------------------------------------------------------------------

test('every M6 chord is discoverable in the hotkeys overlay', async () => {
  const { HotkeysOverlay } = await import('../src/render/HotkeysOverlay.tsx');
  const html = renderToStaticMarkup(<HotkeysOverlay onClose={() => undefined} />);
  for (const chord of ['CTRL+Z', 'E  (CTRL+E)', 'T', 'B', 'P', 'CTRL+A', 'Y', 'N', 'CTRL+Q']) {
    expect(html, `${chord} is bound but not documented`).toContain(chord);
  }
  // The overlay is built from KEYMAP itself, so this cannot drift; what it
  // catches is a row deleted from the table and left in a handler.
  expect(html).toContain('yieldTo');
  expect(html).toContain('setShouldAutoYield');
});

// ---------------------------------------------------------------------------
// 8. The acts the board sends are the §2.2 bodies, spelled exactly
// ---------------------------------------------------------------------------

test('BoardActions is the whole outbound surface, and every M6 act has a body', () => {
  // A compile-time list would not catch a renamed field, so this is the shape
  // the transport will hand to `JSON.stringify` (main.tsx builds exactly these).
  const sent: ActBody[] = [];
  const actions: BoardActions = {
    ...NO_ACTIONS,
    undo: () => sent.push({ action: 'undo' }),
    passPriority: () => sent.push({ action: 'passPriority' }),
    alphaStrike: () => sent.push({ action: 'alphaStrike' }),
    yieldTo: (kind: YieldKind, phase?: string, turn?: StopTurn) =>
      sent.push(
        phase === undefined
          ? { action: 'yieldTo', kind }
          : turn === undefined
            ? { action: 'yieldTo', kind, phase }
            : { action: 'yieldTo', kind, phase, turn },
      ),
    setYield: (yieldKey: string, mode: SetYieldMode) =>
      sent.push({ action: 'setYield', yieldKey, mode }),
    setPhaseStop: (phase: string, turn: StopTurn, stop: boolean) =>
      sent.push({ action: 'setPhaseStop', phase, turn, stop }),
    newGame: (mode: 'continue' | 'restart') => sent.push({ action: 'newGame', mode }),
  };
  actions.undo();
  actions.passPriority();
  actions.alphaStrike();
  actions.yieldTo('endOfTurn');
  actions.yieldTo('marker', 'END_OF_TURN', 'opp');
  actions.setYield('y4', 'clear');
  actions.setPhaseStop('DRAW', 'own', true);
  actions.newGame('continue');
  expect(sent).toEqual([
    { action: 'undo' },
    { action: 'passPriority' },
    { action: 'alphaStrike' },
    { action: 'yieldTo', kind: 'endOfTurn' },
    { action: 'yieldTo', kind: 'marker', phase: 'END_OF_TURN', turn: 'opp' },
    { action: 'setYield', yieldKey: 'y4', mode: 'clear' },
    { action: 'setPhaseStop', phase: 'DRAW', turn: 'own', stop: true },
    { action: 'newGame', mode: 'continue' },
  ]);
});

// ---------------------------------------------------------------------------
// 9. The `sideboard` ask, from the first recording that has ever contained one
// ---------------------------------------------------------------------------

test('the sideboard ask renders as AskModal’s two-column form, from the real fixture', () => {
  // M5 follow-up 1: `sideboard` had no recording and only M6 could give it one,
  // because the ask fires between games of a `--games N` match and the session
  // did not survive game 1's `over`. `fixtures/games/human-sideboard-7.jsonl` is
  // that recording — game 2 of a two-game match — and this is the first time the
  // branch `AskModal` has carried since M5 meets a body Forge actually built.
  const path = fileURLToPath(new URL('../../fixtures/games/human-sideboard-7.jsonl', import.meta.url));
  const log = parseFrameLog(readFileSync(path, 'utf8'));
  let state = initialState(log.header);
  let at: ClientState | null = null;
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (state.ask?.kind === 'sideboard') {
      at = state;
      break;
    }
  }
  expect(at, 'the sideboard fixture carries no sideboard ask').not.toBeNull();
  const ask = at!.ask as { kind: 'sideboard'; main: unknown[]; side: unknown[]; askId: string };
  expect(ask.main.length).toBeGreaterThan(0);
  expect(ask.side.length).toBeGreaterThan(0);

  const html = live(at!);
  // It is a MODAL, not a board picker: a decklist is not on the table (§D33 —
  // every option must already be drawn, and 55 cards in a sideboard are not).
  expect(html).toContain('ask-modal__scrim');
  expect(html).toContain('ask-modal__two');
  expect(html).toContain('Main deck');
  expect(html).toContain('Pool');
  // Ask-local indices across `main ++ side`, which is what the answer echoes.
  expect(html).toContain('ask-local indices across both');
  // The modal's own controls: build an answer, or take §5.4's always-legal
  // default. A `sideboard` a seat cannot answer is a wedged game thread.
  expect(html).toContain('Answer');
  expect(html).toContain(ask.askId);
});

// ---------------------------------------------------------------------------
// 10. Amendment M42 — a connect with no `input` frame at all
// ---------------------------------------------------------------------------

test('M42: the board renders from hello_ok + state alone, with no `input` frame', () => {
  // §2.1 as of amendment M42: an `input` reaches a client only after the engine
  // has asked this seat something, so a client that connects before the first
  // prompt legitimately holds a board and a null `input`. The reducer has always
  // typed it `InputBody | null` and every reader guards — this pins that, because
  // the bridge now *relies* on it: before M42 it re-delivered the empty
  // pre-engine struct to avoid the shape, and that frame is what raced gate step
  // 10g into sending `setPhaseStop` 128 ms before the engine's first real input.
  const log = parseFrameLog(readFileSync(SYNTHETIC, 'utf8'));
  const hello = log.frames.find((f) => f.type === 'hello_ok');
  const firstState = log.frames.find((f) => f.type === 'state');
  expect(hello, 'the synthetic fixture has no hello_ok').toBeDefined();
  expect(firstState, 'the synthetic fixture has no state').toBeDefined();

  let state = initialState(log.header);
  state = reduce(state, hello!);
  state = reduce(state, firstState!);

  expect(state.input).toBeNull();
  expect(state.board).not.toBeNull();

  const html = live(state);
  // The panel says so in the engine's own terms rather than rendering a prompt
  // nobody sent, and there is no wedge banner: `wedgeSuspected` returns false on
  // a null input, which is the same rule read from the other end.
  expect(html).toContain('the engine has not asked for anything yet');
  expect(html).not.toContain('Nothing to do.');
  // It is a board, not a placeholder: the table mounted around the missing input.
  expect(html).toContain('table__middle');

  // And the first `input` the engine does push lands on top of it.
  const firstInput = log.frames.find((f) => f.type === 'input');
  expect(firstInput, 'the synthetic fixture has no input frame').toBeDefined();
  const after = reduce(state, firstInput!);
  expect(after.input).not.toBeNull();
  expect(live(after)).not.toContain('the engine has not asked for anything yet');
});
