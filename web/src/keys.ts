/*
 * mtg-table — keys.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The keyboard map (report 10 §12), as **one table and two pure functions**.
 *
 * The table is the single source for both the handler and the `?` overlay, so
 * the help can never drift from the behaviour — a help screen that lists a key
 * the handler does not implement is worse than no help screen.
 *
 * The bindings are Forge's own wherever Forge has one. `ForgePreferences.java`
 * lines 330-349 hold them as `java.awt.event.KeyEvent` keycodes (report 10 §12.1
 * decodes every one against the jar), and the four we take that Forge does not
 * have are marked as divergences in the table itself rather than in a comment:
 *
 *   - `Space` = **the focused button** (M6). Forge has no global binding:
 *     `FLabel.java:220-223` activates the *focused* Swing label, and which
 *     label that is is the sixth argument of `updateButtons`, which now reaches
 *     us as `input.buttons.focus` (docs/protocol.md §4, report 11 §11). So this
 *     row is no longer a divergence in behaviour, only in mechanism: the engine
 *     says which button, and with no answer it is OK, exactly as in M4.
 *   - `Esc` = Cancel. Forge binds it on the two prompt buttons
 *     (`VPrompt.java:74-84`), guarded by `UI_ALLOW_ESC_TO_END_TURN` when Cancel
 *     reads "End Turn" — we do not have that pref, so we always bind it and the
 *     engine's own `cancel.enabled` decides whether anything happens.
 *   - `T` = pass to my next turn. Forge's `T` is `SHORTCUT_SHOWTARGETING`; our
 *     targeting overlay is always on, so there is nothing to toggle (§16.4.3).
 *   - `B` = pass to before my turn. Unbound in Forge.
 *   - **M5**: `W U B R G C` spend one floating mana (`act: useMana`, §2.2) —
 *     Forge's desktop client spends from its mana pool panel and binds no key,
 *     and our own console seat has taken `m W|U|B|R|G|C` since M2. `C` and `B`
 *     keep their M4/M6 meanings whenever the pool does not hold that colour;
 *     the pool is the engine's own count (§3.1) and nothing here predicts it.
 *
 * **No rules live here.** A plan is "send this act" or "toggle this panel" or
 * "nothing, and here is why" — never "this would be legal". `planKey` reads the
 * engine's own `enabled` flags out of the context it is handed and nothing else
 * (`CLAUDE.md` §Scope, report 10 §18.3).
 *
 * Pure, no React, no DOM types: `web/test/keys.test.ts` imports it from
 * `node --test`, which is where the assertion that this table is total lives.
 */

import type { ButtonFocus, ManaColor, YieldKind, YieldMode } from './protocol.ts';
import { manaColorForKey } from './render/pool.ts';

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

export type KeyActionId =
  | 'ok'
  | 'cancel'
  | 'useMana'
  | 'concede'
  | 'zoom'
  | 'toggleStack'
  | 'toggleCombat'
  | 'toggleLog'
  | 'toggleHotkeys'
  | 'autoPay'
  | 'undo'
  | 'passPriority'
  | 'passEndTurn'
  | 'passMyTurn'
  | 'passBeforeTurn'
  | 'alphaStrike'
  | 'alwaysYes'
  | 'alwaysNo'
  | 'toggleView'
  | 'skipCues'
  | 'cameraView'
  | 'cameraDirector'
  | 'toggleSpectator'
  | 'openWorkshop'
  | 'inspectCard'
  | 'toggleSound'
  | 'toggleCaption';

/**
 * **M7 Tier 2 (T8) — the arena's camera, by key.** The ids are `camera.ts`'s
 * `ViewId`s plus `director`. They are spelled out here rather than imported
 * because this file is on the 2D path and **nothing under `arena/` may be
 * imported statically from it** (D49 — the arena chunk stays lazy);
 * `web/test/keys.test.ts` asserts the two lists agree, key for key.
 */
export type CameraKeyChoice = 'table' | 'shoulder' | 'oppShoulder' | 'side' | 'low' | 'director';

export const CAMERA_KEYS: Readonly<Record<string, CameraKeyChoice>> = {
  '1': 'table',
  '2': 'shoulder',
  '3': 'oppShoulder',
  '4': 'side',
  '5': 'low',
  '6': 'director',
  '0': 'director',
};

export interface KeyBinding {
  id: KeyActionId;
  /** What the overlay prints, and what the button chip says: `SPACE`, `CTRL+Z`. */
  chord: string;
  /** Lowercased `event.key` values that match. `' '` is Space; `code` also matches. */
  keys: readonly string[];
  /** Ctrl (or Cmd) must be held. Every other binding rejects it. */
  ctrl: boolean;
  /** What it does, in the user's words. */
  what: string;
  /** Forge's own binding, or the divergence, verbatim from report 10 §12.1. */
  forge: string;
  /** The milestone that made it do something. Every row is live as of M6. */
  milestone: 'M4' | 'M5' | 'M6' | 'M7';
}

export const KEYMAP: readonly KeyBinding[] = [
  {
    id: 'ok',
    chord: 'SPACE',
    keys: [' ', 'spacebar', 'space'],
    ctrl: false,
    what: "press the button the engine focused — OK unless input.buttons.focus says Cancel",
    forge: 'FLabel.java:220-223 — the desktop activates the FOCUSED label; focus1 is updateButtons’ sixth argument and reaches us as input.buttons.focus (M6)',
    milestone: 'M4',
  },
  {
    id: 'cancel',
    chord: 'ESC',
    keys: ['escape', 'esc'],
    ctrl: false,
    what: "press the engine's Cancel button; closes an overlay or answers an open question with null first",
    forge: 'VPrompt.java:74-84 — Esc is bound on the prompt buttons',
    milestone: 'M4',
  },
  {
    id: 'concede',
    chord: 'CTRL+Q',
    keys: ['q'],
    ctrl: true,
    what: 'concede — press twice, because there is no undo for it',
    forge: 'SHORTCUT_CONCEDE = 17 81',
    milestone: 'M4',
  },
  {
    id: 'zoom',
    chord: 'Z',
    keys: ['z'],
    ctrl: false,
    what: 'zoom the card under the pointer, or the focused one',
    forge: 'SHORTCUT_CARD_ZOOM = 90',
    milestone: 'M4',
  },
  {
    id: 'toggleStack',
    chord: 'S',
    keys: ['s'],
    ctrl: false,
    what: 'show or hide the stack panel',
    forge: 'SHORTCUT_SHOWSTACK = 83',
    milestone: 'M4',
  },
  {
    id: 'toggleCombat',
    chord: 'C',
    keys: ['c'],
    ctrl: false,
    what: 'emphasise the combat arrows',
    forge: 'SHORTCUT_SHOWCOMBAT = 67 — Forge opens a combat panel; ours is always drawn',
    milestone: 'M4',
  },
  {
    id: 'toggleLog',
    chord: 'L',
    keys: ['l'],
    ctrl: false,
    what: 'open or close the log drawer',
    forge: 'SHORTCUT_SHOWCONSOLE = 76',
    milestone: 'M4',
  },
  {
    id: 'toggleHotkeys',
    chord: 'H  or  ?',
    keys: ['h', '?'],
    ctrl: false,
    what: 'this list',
    forge: 'SHORTCUT_SHOWHOTKEYS = 72',
    milestone: 'M4',
  },
  {
    id: 'autoPay',
    chord: 'A',
    keys: ['a'],
    ctrl: false,
    what: "auto-pay a mana cost — press SPACE instead: it is the engine's OK button",
    forge:
      "InputPayMana.supportAutoPay() — Forge sends it as the OK button's own 'Auto' label, so M5 wired the rest of payment (lands are clicks, the pool is W/U/B/R/G/C) and left this one to the button that already exists",
    milestone: 'M5',
  },
  {
    id: 'undo',
    chord: 'CTRL+Z',
    keys: ['z'],
    ctrl: true,
    what: 'undo the last mana ability — tapping a land, a mana rock; never a cast',
    forge: 'SHORTCUT_UNDO = 17 90 → IGameController.undoLastAction(), gated on state.undo.can',
    milestone: 'M6',
  },
  {
    id: 'passPriority',
    chord: 'P',
    keys: ['p'],
    ctrl: false,
    what: 'pass priority — a no-op unless the engine is asking for one',
    forge:
      'IGameController.passPriority() [jar]: presses OK only when the current input is InputPassPriority, which is why it is safer than SPACE for this. Forge’s own P is SHORTCUT_YIELD_AUTO_PASS, which writes and SAVES a pref — deliberately not that (report 11 §11)',
    milestone: 'M6',
  },
  {
    id: 'passEndTurn',
    chord: 'E  (CTRL+E)',
    keys: ['e'],
    ctrl: false,
    what: 'pass to the end of this turn (act: yieldTo endOfTurn) — Cancel stops it',
    forge: 'SHORTCUT_ENDTURN = 17 69 → YieldController.endTurn — we bind the bare key as well',
    milestone: 'M6',
  },
  {
    id: 'passMyTurn',
    chord: 'T',
    keys: ['t'],
    ctrl: false,
    what: 'pass to my next turn (a marker on my UPKEEP)',
    forge:
      "YieldUpdate.SetMarker(me, UPKEEP) — UNTAP has no priority pass, so a marker there could never fire (InputPassPriority:248-255). Divergence: Forge's T is SHORTCUT_SHOWTARGETING and our arrows are always on",
    milestone: 'M6',
  },
  {
    id: 'passBeforeTurn',
    chord: 'B',
    keys: ['b'],
    ctrl: false,
    what: 'pass to just before my turn — the opponent’s end step (a marker on END_OF_TURN)',
    forge: 'YieldUpdate.SetMarker(opponent, END_OF_TURN) — divergence: unbound in Forge',
    milestone: 'M6',
  },
  {
    id: 'alphaStrike',
    chord: 'CTRL+A',
    keys: ['a'],
    ctrl: true,
    what: 'attack with everything (only meaningful while declaring attackers)',
    forge: 'SHORTCUT_ALPHASTRIKE = 17 65 → IGameController.alphaStrike()',
    milestone: 'M6',
  },
  {
    id: 'alwaysYes',
    chord: 'Y',
    keys: ['y'],
    ctrl: false,
    what: 'always yes to the ability on top of the stack (and answer this one)',
    forge:
      'SHORTCUT_AUTOYIELD_ALWAYS_YES = 89 → setTriggerDecision(ACCEPT) + setShouldAutoYield, exactly the guards KeyboardShortcuts.java:159-174 checks',
    milestone: 'M6',
  },
  {
    id: 'alwaysNo',
    chord: 'N',
    keys: ['n'],
    ctrl: false,
    what: 'always no to the ability on top of the stack',
    forge: 'SHORTCUT_AUTOYIELD_ALWAYS_NO = 78 → setTriggerDecision(DECLINE) + setShouldAutoYield',
    milestone: 'M6',
  },
  {
    // **M7.** The view switch, and report 09 §2.2 asks for exactly this key and
    // exactly this reason: `V` is deliberately NOT one Forge uses (M6 mirrors
    // its SHORTCUT_* set — Y/N/P, space, Esc), so binding it collides with
    // nothing a Forge player already has in their fingers. It lives in this
    // table rather than in a handler of its own because the alternative is two
    // keyboards for one page, only one of which the `?` overlay can describe.
    id: 'toggleView',
    chord: 'V',
    keys: ['v'],
    ctrl: false,
    what: 'switch between the 2D board and the 3D arena (the same game, two renderers)',
    forge: 'divergence: Forge has one renderer and no such key (report 09 §2.2)',
    milestone: 'M7',
  },
  {
    // **M7, and it is an accessibility control before it is a comfort one.**
    // The arena's whole vocabulary is motion; `prefers-reduced-motion` turns
    // every cue into a snap, and this is the same escape hatch for someone who
    // has not set that pref — or who has, for one animation, changed their mind.
    // Skipping is `apply(t = 1)` then `end()`, so the board it lands on is
    // exactly `layout(state)`: the board the engine described.
    id: 'skipCues',
    chord: 'K',
    keys: ['k'],
    ctrl: false,
    what: 'skip every animation playing in the arena — the board jumps to what the engine said',
    forge: 'divergence: Forge animates nothing, so it has nothing to skip (report 09 §5.1)',
    milestone: 'M7',
  },
  {
    // **M7 Tier 2 (T8) — the arena's five named camera views.** Digits because
    // Forge binds none of them (its SHORTCUT_MACRO_* use Shift+2 / Shift+3,
    // which arrive as `@` / `#` and never reach this row), and one row for all
    // five because the overlay is a list of keys, not of views. On the 2D board
    // the row is bound and says why it does nothing (`KeyContext.arena`).
    id: 'cameraView',
    chord: '1 2 3 4 5',
    keys: ['1', '2', '3', '4', '5'],
    ctrl: false,
    what: "arena camera: 1 table · 2 your shoulder · 3 opponent's shoulder · 4 side-on · 5 low angle — press the one you are on to drop your own orbit of it; 3 and 4 are for spectating (they cannot keep your hand on screen)",
    forge: 'divergence: Forge has one fixed 2D view and no camera (report 09 §8)',
    milestone: 'M7',
  },
  {
    id: 'cameraDirector',
    chord: '6  or  0',
    keys: ['6', '0'],
    ctrl: false,
    what: 'arena camera: the director — cuts between the five views on the game’s own events (combat side-on, a spell from its caster’s shoulder); replays and spectating only',
    forge: 'divergence: Forge has no camera (report 09 §8)',
    milestone: 'M7',
  },
  {
    id: 'toggleSpectator',
    chord: 'O',
    keys: ['o'],
    ctrl: false,
    what: 'arena camera: spectator mode on / off — a wider orbit, slower camera moves, every view; on by itself in a replay and when your game ends, never while your seat is live',
    forge: 'divergence: unbound in Forge (its CTRL+O is card overlays)',
    milestone: 'M7',
  },
  {
    // **The workshop** (`web/src/workshop/`, `#workshop`): the card viewer that
    // puts one card on a pedestal with the arena's own renderer — its body, props,
    // clips and cues — to workshop the identity work. A picture key like the
    // camera rows: live in the arena, `inert` on the board with the reason, and
    // dispatched by `main.tsx`, which owns the view (the arena's own handler is
    // left untouched). It sits BEFORE `useMana` on purpose: `bindingFor` is a
    // first-match lookup, and `planKey`'s pre-pass still gives `W` to floating
    // white mana on the board, so the two meanings never meet.
    id: 'openWorkshop',
    chord: 'W',
    keys: ['w'],
    ctrl: false,
    what: 'open the workshop from the arena — one card on a pedestal: its figure, props, clips and cues (spends floating white mana instead on the board, while the pool holds it)',
    forge: 'divergence: Forge has no 3D figures to workshop',
    milestone: 'M7',
  },
  {
    // **Inspect from the table** (D241): the card under the pointer — else the
    // last one clicked — opens the workshop's inspect view on it
    // (`#workshop?card=<name>&view=inspect`), dressed and in the look the arena
    // is in; the workshop's back link returns to the same frame. A picture key
    // like `W`: navigation, no act, legal on a replay and behind an open ask —
    // from the arena, which says which card it is (`KeyContext.inspect`, from
    // `arena/inspect.ts`'s planner) and why when there is none, and NEVER for a
    // face-down or hidden card. On the board it says where it lives, as the
    // camera rows do. `I` is bound by nothing else here and by nothing in Forge.
    id: 'inspectCard',
    chord: 'I',
    keys: ['i'],
    ctrl: false,
    what: "inspect the card under the pointer (or the last one clicked) in the workshop: its figure in front of its painting — face up only; the workshop's arena link comes back to this frame",
    forge: 'divergence: Forge has no 3D figures to inspect (its card zoom is our Z)',
    milestone: 'M7',
  },
  {
    // **D250/D251 — the arena's sound, on and off.** Muted until the viewer turns
    // it on (a key press is the gesture a browser needs before it will make a
    // sound), and the choice is kept in this browser. A picture key like the
    // camera rows: local, sends nothing, legal on a replay and behind an open ask
    // — and on the board, which makes no sound, it says where it lives. `M` is
    // bound by nothing else here, and Forge binds no key to its own sounds.
    id: 'toggleSound',
    chord: 'M',
    keys: ['m'],
    ctrl: false,
    what: "the 3D arena's sound on or off — muted until you turn it on; kept in this browser (the cue strip's sound checkbox is the same switch)",
    forge: "divergence: Forge's sounds are a preference (UI_ENABLE_SOUNDS), bound to no key",
    milestone: 'M7',
  },
  {
    // **The caption** (D255, D256): the story's moment for the frame on screen,
    // in a strip over the arena's table — on by default while watching, off at a
    // live seat. A picture key like the camera rows: no act, legal on a replay
    // and behind an ask. **`N` is also Forge's always-no** (the row above,
    // SHORTCUT_AUTOYIELD_ALWAYS_NO), and `bindingFor`'s first match stays that
    // row, so this one is reached only through `planKey`'s pre-pass — in the
    // arena, which draws no auto-yield control (it answered N with "a board
    // control — press V"), and on a READ-ONLY board, where always-no could only
    // ever say "read-only". A live board's N is Forge's, untouched.
    id: 'toggleCaption',
    chord: 'N',
    keys: ['n'],
    ctrl: false,
    what: "the arena's caption: the story's moment for the frame on screen, the one or two before it dimmed — on by default in a replay and while spectating, off at a live seat (on a live board N is always-no)",
    forge: 'divergence: Forge has no narrator; its N is SHORTCUT_AUTOYIELD_ALWAYS_NO, which stays N on a live board',
    milestone: 'M7',
  },
  {
    // **M5 — the one real dead end M4 handed over.** LAST on purpose:
    // `bindingFor` is a first-match lookup, so with an empty pool `C` is still
    // Forge's SHORTCUT_SHOWCOMBAT and `B` is still pass-to-before-my-turn, and
    // only `W`/`U`/`R`/`G` — which nothing else binds — reach this row. When the
    // pool actually holds the colour, `planKey`'s pre-pass takes the key before
    // the table is consulted at all: floating mana is transient, and the two
    // panels it borrows for a moment are not going anywhere.
    id: 'useMana',
    chord: 'W U B R G C',
    keys: ['w', 'u', 'b', 'r', 'g', 'c'],
    ctrl: false,
    what: 'spend one floating mana of that colour, while the pool holds it',
    forge: "no desktop shortcut — Forge spends from its mana pool panel; the console seat's own `m W|U|B|R|G|C` (act: useMana, §2.2)",
    milestone: 'M5',
  },
];

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * The fields of a `KeyboardEvent` this module reads. Written out so the test can
 * build one without a DOM, and so nothing here can reach for a field the
 * handler has not thought about.
 *
 * `code` is read as well as `key` because `key` alone is not testable in a
 * browser driver: an automation driver delivers Space as
 * `{key: "", code: "", keyCode: 0}` (measured in the live page during M3),
 * while Escape arrives correctly. Any driver or layout that sets one of the two
 * agrees on this key.
 */
export interface KeyEventLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  target?: KeyTargetLike | null;
}

export interface KeyTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
}

/** A field: the control owns every key, including Escape. */
export function isTypingTarget(target: KeyTargetLike | null | undefined): boolean {
  if (target == null) return false;
  if (target.isContentEditable === true) return true;
  const tag = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

/**
 * A focused button, link or summary: it owns **Space and Enter** (the browser
 * activates it) and nothing else. M3 dropped every key for these elements,
 * which meant Escape stopped working the moment you clicked a card.
 */
export function ownsActivationKeys(target: KeyTargetLike | null | undefined): boolean {
  if (target == null) return false;
  const tag = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
  return tag === 'button' || tag === 'a' || tag === 'summary';
}

/** The binding a raw event names, or `null`. Context-free, so it is a lookup. */
export function bindingFor(event: KeyEventLike): KeyBinding | null {
  if (event.isComposing === true) return null;
  if (event.altKey === true) return null;
  const ctrl = event.ctrlKey === true || event.metaKey === true;
  const key = (event.key || '').toLowerCase();
  const code = (event.code ?? '').toLowerCase();
  for (const binding of KEYMAP) {
    if (binding.ctrl !== ctrl) continue;
    if (binding.keys.includes(key)) return binding;
    // The physical-key spelling, for Space only: `code` is `KeyZ` for `z`, which
    // must not match the `undo` binding when Ctrl is not held.
    if (code === 'space' && binding.keys.includes(' ')) return binding;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

/**
 * What the board knows when a key arrives. Every field is the **engine's**
 * answer or a view flag — nothing here is derived from the rules.
 */
export interface KeyContext {
  /** A seat, not a replay, and the game is not over. */
  live: boolean;
  /** An `ask` is outstanding: the game thread is parked inside that call. */
  askOpen: boolean;
  /** `input.buttons.ok.enabled`, verbatim. */
  okEnabled: boolean;
  /** `input.buttons.cancel.enabled`, verbatim. */
  cancelEnabled: boolean;
  /** Whether a card is selectable right now — only for the `why` of a dead Space. */
  haveSelectable: boolean;
  /**
   * The colours this seat's floating mana pool actually holds (§3.1), which is
   * the engine's own number echoed — never a prediction of what is payable.
   * `W` through `C` spend one while the pool has it, and mean their M4/M6
   * bindings when it does not.
   */
  poolColors: readonly string[];
  /** An overlay that Escape should close before it reaches the engine. */
  overlay: 'none' | 'zoom' | 'hotkeys' | 'zones';
  /**
   * **M6** — `input.buttons.focus`, verbatim (§4). SPACE presses the button the
   * engine focused; `null` (and every pre-M6 recording) means OK, which is M4's
   * behaviour unchanged. Never guessed: the engine sent it or it is `null`.
   */
  focus?: ButtonFocus;
  /** **M6** — `state.undo.can`, verbatim. The engine's answer, not a rule. */
  canUndo?: boolean;
  /**
   * **M6** — the opaque `yieldKey` of the stack item Y / N would act on: the
   * **top** item, and only when the engine called it an ability with a key
   * (`stackYield().offered`). `null` means the two keys have nothing to address.
   */
  topYieldKey?: string | null;
  /** **M6** — whether that top item already carries a yield (for the flash text). */
  topYielded?: YieldMode | null;
  /**
   * **M7 Tier 2 (T8)** — the renderer on screen has a camera: the arena. The
   * board leaves it unset, and the camera rows then plan an `inert` that says
   * "press V" instead of being swallowed — the board's `view` dispatcher has
   * no branch for them and must not grow one (CLAUDE.md M4 convention 4).
   */
  arena?: boolean;
  /**
   * **D241** — what `I` would inspect in the arena: the card under the pointer,
   * else the last one clicked, as `arena/inspect.ts`'s planner decided it (a
   * link for a face-up card with a figure, or the reason there is none — a
   * face-down or hidden card is always a reason). Absent or `null`: nothing
   * hovered or clicked. The board leaves it unset.
   */
  inspect?: { href: string; name: string } | { why: string } | null;
}

export type KeyPlan =
  | { kind: 'buttonOk' }
  | { kind: 'buttonCancel' }
  /** §5.4 — answering an open ask with `null` is always legal. */
  | { kind: 'answerNull' }
  /** §2.2 — `act: useMana {color}`, the colour being one the pool holds. */
  | { kind: 'useMana'; color: ManaColor }
  | { kind: 'concede' }
  | { kind: 'closeOverlay' }
  /** A local view toggle: legal in a replay too, because it sends nothing. */
  | { kind: 'view'; id: KeyActionId }
  /** §2.2 (M6) — `act: undo`, gated on the engine's own `state.undo.can`. */
  | { kind: 'undo' }
  /** §2.2 (M6) — `act: passPriority`; a no-op in the engine outside a priority pass. */
  | { kind: 'passPriority' }
  /** §2.2 (M6) — `act: alphaStrike`. */
  | { kind: 'alphaStrike' }
  /** §2.2 (M6) — `act: yieldTo {kind, phase?, turn?}`; the three engine yields. */
  | { kind: 'yieldTo'; yield: YieldKind; phase?: string; turn?: 'own' | 'opp' }
  /** §2.2 (M6) — `act: setYield {yieldKey, mode}` on the top stack item. */
  | { kind: 'setYield'; yieldKey: string; mode: YieldMode }
  /**
   * **M7 Tier 2 (T8)** — point the arena's camera. Local and sends nothing, so
   * it is legal on a replay and while an ask is open; whether the view may be
   * used at a live seat is the arena's to say (`camera.ts`'s `seatSafe`).
   */
  | { kind: 'camera'; choice: CameraKeyChoice }
  /** **M7 Tier 2 (T8)** — spectator mode on / off. Local, sends nothing. */
  | { kind: 'spectator' }
  /**
   * **D241** — open the workshop's inspect view on this card: navigation to
   * `href` (`#workshop?card=<name>&view=inspect`), which sends nothing.
   */
  | { kind: 'inspect'; href: string; name: string }
  /** **D251** — the arena's sound on / off. Local, sends nothing. */
  | { kind: 'sound' }
  /** Bound, understood, and deliberately does nothing yet — with the reason. */
  | { kind: 'inert'; why: string };

/**
 * §2.2 / report 11 §4.1 — what "pass to my next turn" and "pass to just before
 * my turn" mean as engine calls. Both are the per-(player, phase) **marker**;
 * the phase is what picks the seat, so the client names a phase and never a
 * player.
 *
 * `UPKEEP` and not `UNTAP` for `passMyTurn`: UNTAP has no priority pass at all,
 * so a marker on it could never fire — Forge's own comment, at
 * `InputPassPriority.java:248-255`, and the reason its own "no actions
 * available" suggestion marks `(me, UPKEEP)`.
 */
export const YIELD_MARKER_MY_TURN = 'UPKEEP';
/** The opponent's end step — the last point before the turn passes to me. */
export const YIELD_MARKER_BEFORE_MY_TURN = 'END_OF_TURN';

/**
 * Whose phase cell each marker goes on. A marker is per-(player, phase), so the
 * phase alone does not say it: `END_OF_TURN` on **my** cell is my own end step,
 * and only the **opponent's** is "just before my turn". Measured in the browser
 * on 2026-09-12, where the act sent without a `turn` came back as
 * `state.yield {kind:"marker", playerId:<me>, phase:"END_OF_TURN"}`.
 */
export const YIELD_MARKER_MY_TURN_SIDE = 'own';
export const YIELD_MARKER_BEFORE_MY_TURN_SIDE = 'opp';

export interface KeyResolution {
  binding: KeyBinding;
  plan: KeyPlan;
}

/**
 * The whole handler, as a pure function of the event and the context.
 *
 * `null` means **do not touch the event**: no `preventDefault`, no flash, no
 * swallowed browser shortcut (report 10 §12.2 rule 3 — swallowing keys we do not
 * use is hostile).
 */
export function planKey(event: KeyEventLike, ctx: KeyContext): KeyResolution | null {
  if (isTypingTarget(event.target)) return null;

  // **Floating mana wins its letter while it is floating.** `C` is
  // SHORTCUT_SHOWCOMBAT and `B` is pass-to-before-my-turn the rest of the time,
  // and `bindingFor` still resolves them that way; this pre-pass is the only
  // place the pool changes what a key means, and it is gated on the engine's
  // own `manaPool` count (§3.1) plus a live seat with no ask outstanding —
  // inside an ask the engine is parked and is listening for one thing (§5).
  const color = manaKeyColor(event);
  if (color !== null && ctx.live && !ctx.askOpen && ctx.poolColors.includes(color)) {
    const manaBinding = KEYMAP.find((b) => b.id === 'useMana');
    if (manaBinding !== undefined) {
      return { binding: manaBinding, plan: { kind: 'useMana', color } };
    }
  }

  // **The caption takes `N` where always-no means nothing** (D256): in the arena
  // (no auto-yield control there) and on a read-only board. A live board keeps
  // Forge's `N`, which `bindingFor` below resolves first.
  if (isCaptionKey(event) && (ctx.arena === true || !ctx.live)) {
    const captionBinding = KEYMAP.find((b) => b.id === 'toggleCaption');
    if (captionBinding !== undefined) {
      return ctx.arena === true
        ? { binding: captionBinding, plan: { kind: 'view', id: 'toggleCaption' } }
        : {
            binding: captionBinding,
            plan: { kind: 'inert', why: "toggles the 3D arena's caption strip — the board has none; press V" },
          };
    }
  }

  const binding = bindingFor(event);
  if (binding === null) return null;
  // A focused button activates itself on Space; sending `buttonOk` as well would
  // answer the engine twice for one press. Escape and the view toggles are not
  // activation keys and stay bound, which is the M3 behaviour this corrects:
  // clicking a card focused its tile, and the whole keyboard went quiet.
  if (binding.id === 'ok' && ownsActivationKeys(event.target)) return null;

  switch (binding.id) {
    case 'ok': {
      if (ctx.askOpen) {
        return { binding, plan: { kind: 'inert', why: 'a question is outstanding — answer it first' } };
      }
      if (!ctx.live) return { binding, plan: { kind: 'inert', why: 'this board is read-only' } };
      // **M6 — SPACE follows the engine's focus** (§4, report 11 §11). Forge's
      // desktop activates the focused label and `updateButtons`' sixth argument
      // is what decides which; with no focus this is M4's behaviour, OK.
      if (ctx.focus === 'cancel') {
        return ctx.cancelEnabled
          ? { binding, plan: { kind: 'buttonCancel' } }
          : {
              binding,
              plan: {
                kind: 'inert',
                why: 'the engine focused Cancel and then disabled it',
              },
            };
      }
      if (!ctx.okEnabled) {
        return {
          binding,
          plan: {
            kind: 'inert',
            why: ctx.haveSelectable
              ? 'OK is disabled and cards are outlined: the engine wants a card click (§4.2)'
              : 'the engine has OK disabled right now',
          },
        };
      }
      return { binding, plan: { kind: 'buttonOk' } };
    }

    case 'cancel':
      if (ctx.overlay !== 'none') return { binding, plan: { kind: 'closeOverlay' } };
      if (ctx.askOpen) {
        // §5.4: every ask is answerable with null, and the bridge substitutes
        // Forge's documented default. Always legal, so always offered.
        return ctx.live
          ? { binding, plan: { kind: 'answerNull' } }
          : { binding, plan: { kind: 'inert', why: 'this board is read-only' } };
      }
      if (!ctx.live) return { binding, plan: { kind: 'inert', why: 'this board is read-only' } };
      if (!ctx.cancelEnabled) {
        return { binding, plan: { kind: 'inert', why: 'the engine has Cancel disabled right now' } };
      }
      return { binding, plan: { kind: 'buttonCancel' } };

    case 'concede':
      // §9 invariant 6 — reachable from every UI state, an open ask included.
      return ctx.live
        ? { binding, plan: { kind: 'concede' } }
        : { binding, plan: { kind: 'inert', why: 'this board is read-only' } };

    case 'useMana':
      // Bound, understood, and the pool is empty of it: say which, rather than
      // doing nothing. (A pool that HAS it never reaches this branch.)
      return {
        binding,
        plan: {
          kind: 'inert',
          why: ctx.live
            ? 'no floating mana of that colour — tap a land first (M5: act useMana, §2.2)'
            : 'this board is read-only',
        },
      };

    case 'zoom':
    case 'toggleStack':
    case 'toggleCombat':
    case 'toggleLog':
    case 'toggleHotkeys':
    // **M7 — both are local and send nothing**, so both are legal on a replay:
    // switching renderer and skipping an animation are things you do to the
    // *picture*, and a read-only board has a picture.
    case 'toggleView':
    case 'skipCues':
      return { binding, plan: { kind: 'view', id: binding.id } };

    case 'cameraView':
    case 'cameraDirector': {
      // **T8.** A picture control: no act, no engine flag, legal on a replay
      // and behind an open ask. The board has no camera, and says so.
      const pressed = (event.key || '').toLowerCase();
      if (ctx.arena !== true) {
        return {
          binding,
          plan: {
            kind: 'inert',
            why: "picks the 3D arena's camera — the board has no camera; press V",
          },
        };
      }
      const choice = CAMERA_KEYS[pressed];
      if (choice === undefined) return null;
      return { binding, plan: { kind: 'camera', choice } };
    }

    case 'openWorkshop':
      // A picture key: it leaves the game on screen and opens a page that sends
      // nothing, so it is legal on a replay and behind an open ask — from the
      // arena. On the board it says where it lives, exactly as the camera rows do.
      if (ctx.arena !== true) {
        return {
          binding,
          plan: {
            kind: 'inert',
            why: 'opens the workshop from the 3D arena — press V first (with floating mana of that colour in the pool, W spends it instead)',
          },
        };
      }
      return { binding, plan: { kind: 'view', id: 'openWorkshop' } };

    case 'inspectCard': {
      // D241 — a picture key: navigation, never an act. The arena says which
      // card (and why not); the board has no figures to inspect and says so.
      if (ctx.arena !== true) {
        return {
          binding,
          plan: { kind: 'inert', why: "inspects a card's figure from the 3D arena — press V first" },
        };
      }
      const target = ctx.inspect ?? null;
      if (target === null) {
        return {
          binding,
          plan: { kind: 'inert', why: 'no card under the pointer and none clicked — hover or click a face-up card, then press I' },
        };
      }
      if ('why' in target) return { binding, plan: { kind: 'inert', why: target.why } };
      return { binding, plan: { kind: 'inspect', href: target.href, name: target.name } };
    }

    case 'toggleSound':
      // D251 — a picture key: the arena's sound, never an act. The board makes
      // no sound, and says where the key lives, as the camera rows do.
      if (ctx.arena !== true) {
        return {
          binding,
          plan: { kind: 'inert', why: "turns the 3D arena's sound on or off — the board makes no sound; press V" },
        };
      }
      return { binding, plan: { kind: 'sound' } };

    case 'toggleSpectator':
      if (ctx.arena !== true) {
        return {
          binding,
          plan: {
            kind: 'inert',
            why: "switches the 3D arena's camera to spectating — the board has no camera; press V",
          },
        };
      }
      return { binding, plan: { kind: 'spectator' } };

    // ---- M6. Every one of these is an act the engine already answers; the
    // ---- only gates are the engine's own flags, read out of the context.
    case 'undo':
      if (!ctx.live) return readOnly(binding);
      if (ctx.askOpen) return askFirst(binding);
      return ctx.canUndo === true
        ? { binding, plan: { kind: 'undo' } }
        : {
            binding,
            plan: {
              kind: 'inert',
              why: 'nothing to undo — the engine says state.undo.can is false (undo holds mana abilities only, and a phase change clears it)',
            },
          };

    case 'passPriority':
      if (!ctx.live) return readOnly(binding);
      if (ctx.askOpen) return askFirst(binding);
      return { binding, plan: { kind: 'passPriority' } };

    case 'passEndTurn':
      if (!ctx.live) return readOnly(binding);
      if (ctx.askOpen) return askFirst(binding);
      return { binding, plan: { kind: 'yieldTo', yield: 'endOfTurn' } };

    case 'passMyTurn':
      if (!ctx.live) return readOnly(binding);
      if (ctx.askOpen) return askFirst(binding);
      return {
        binding,
        plan: {
          kind: 'yieldTo',
          yield: 'marker',
          phase: YIELD_MARKER_MY_TURN,
          turn: YIELD_MARKER_MY_TURN_SIDE,
        },
      };

    case 'passBeforeTurn':
      if (!ctx.live) return readOnly(binding);
      if (ctx.askOpen) return askFirst(binding);
      return {
        binding,
        plan: {
          kind: 'yieldTo',
          yield: 'marker',
          phase: YIELD_MARKER_BEFORE_MY_TURN,
          turn: YIELD_MARKER_BEFORE_MY_TURN_SIDE,
        },
      };

    case 'alphaStrike':
      if (!ctx.live) return readOnly(binding);
      if (ctx.askOpen) return askFirst(binding);
      return { binding, plan: { kind: 'alphaStrike' } };

    case 'alwaysYes':
    case 'alwaysNo': {
      if (!ctx.live) return readOnly(binding);
      // An ask is NOT a reason to refuse this one: Forge's own
      // `setTriggerDecision` presses the button in front of you when the current
      // input is the `InputConfirm` for that same key (report 11 §5.1). But the
      // key has to exist, and only the engine can say that.
      const key = ctx.topYieldKey ?? null;
      if (key === null) {
        return {
          binding,
          plan: {
            kind: 'inert',
            why: 'nothing on top of the stack that the engine offers an auto-yield for (it must be an ability with a key)',
          },
        };
      }
      const mode: YieldMode = binding.id === 'alwaysYes' ? 'yes' : 'no';
      return ctx.topYielded === mode
        ? {
            binding,
            plan: {
              kind: 'inert',
              why: `already set to always ${mode} — clear it from the stack panel`,
            },
          }
        : { binding, plan: { kind: 'setYield', yieldKey: key, mode } };
    }

    default:
      return {
        binding,
        plan: {
          kind: 'inert',
          why: `${binding.what} — ${binding.milestone}: ${binding.forge}`,
        },
      };
  }
}

/** A replay: every key that would send an act says so, rather than doing nothing. */
function readOnly(binding: KeyBinding): KeyResolution {
  return { binding, plan: { kind: 'inert', why: 'this board is read-only' } };
}

/**
 * §5 — the game thread is parked inside an `ask` and is listening for exactly
 * one thing. An act sent now reaches a controller nobody is reading.
 */
function askFirst(binding: KeyBinding): KeyResolution {
  return {
    binding,
    plan: { kind: 'inert', why: 'a question is outstanding — answer it first' },
  };
}

/**
 * The colour a bare letter names, or `null`. `code` is read as well as `key` for
 * the same reason `bindingFor` reads it: an automation driver can deliver one
 * and not the other.
 */
export function manaKeyColor(event: KeyEventLike): ManaColor | null {
  if (event.isComposing === true || event.altKey === true) return null;
  if (event.ctrlKey === true || event.metaKey === true) return null;
  const fromKey = manaColorForKey(event.key || '');
  if (fromKey !== null) return fromKey;
  const code = event.code ?? '';
  return code.length === 4 && code.startsWith('Key') ? manaColorForKey(code.slice(3)) : null;
}

/** A bare `N` (no Ctrl, Cmd or Alt; not mid-composition) — the caption's key where always-no means nothing. */
export function isCaptionKey(event: KeyEventLike): boolean {
  if (event.isComposing === true || event.altKey === true) return false;
  if (event.ctrlKey === true || event.metaKey === true) return false;
  const key = (event.key || '').toLowerCase();
  return key === 'n' || (key === '' && event.code === 'KeyN');
}

/** The binding for one action id, for a button that wants to print its chord. */
export function chordFor(id: KeyActionId): string {
  return KEYMAP.find((binding) => binding.id === id)?.chord ?? '';
}
