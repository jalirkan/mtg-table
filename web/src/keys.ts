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
 *   - `Space` = OK. Forge has **no global binding**: `FLabel.java:220-223`
 *     activates the *focused* Swing label, which is a different thing. Adopted
 *     from the reference look, and this is the divergence the user sees most.
 *   - `Esc` = Cancel. Forge binds it on the two prompt buttons
 *     (`VPrompt.java:74-84`), guarded by `UI_ALLOW_ESC_TO_END_TURN` when Cancel
 *     reads "End Turn" — we do not have that pref, so we always bind it and the
 *     engine's own `cancel.enabled` decides whether anything happens.
 *   - `T` = pass to my next turn. Forge's `T` is `SHORTCUT_SHOWTARGETING`; our
 *     targeting overlay is always on, so there is nothing to toggle (§16.4.3).
 *   - `B` = pass to before my turn. Unbound in Forge.
 *
 * **No rules live here.** A plan is "send this act" or "toggle this panel" or
 * "nothing, and here is why" — never "this would be legal". `planKey` reads the
 * engine's own `enabled` flags out of the context it is handed and nothing else
 * (`CLAUDE.md` §Scope, report 10 §18.3).
 *
 * Pure, no React, no DOM types: `web/test/keys.test.ts` imports it from
 * `node --test`, which is where the assertion that this table is total lives.
 */

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

export type KeyActionId =
  | 'ok'
  | 'cancel'
  | 'concede'
  | 'zoom'
  | 'toggleStack'
  | 'toggleCombat'
  | 'toggleLog'
  | 'toggleHotkeys'
  | 'autoPay'
  | 'undo'
  | 'passEndTurn'
  | 'passMyTurn'
  | 'passBeforeTurn'
  | 'alphaStrike'
  | 'alwaysYes'
  | 'alwaysNo';

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
  /** The milestone that makes it do something. Anything past M4 is inert today. */
  milestone: 'M4' | 'M5' | 'M6';
}

export const KEYMAP: readonly KeyBinding[] = [
  {
    id: 'ok',
    chord: 'SPACE',
    keys: [' ', 'spacebar', 'space'],
    ctrl: false,
    what: "press the engine's OK button (usually pass priority)",
    forge: 'divergence — Forge activates the focused label, it has no global Space',
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
    what: 'auto-pay a mana cost',
    forge: "InputPayMana.supportAutoPay() — Forge sends it as the OK button's own 'Auto' label",
    milestone: 'M5',
  },
  {
    id: 'undo',
    chord: 'CTRL+Z',
    keys: ['z'],
    ctrl: true,
    what: 'undo the last action',
    forge: 'SHORTCUT_UNDO = 17 90',
    milestone: 'M6',
  },
  {
    id: 'passEndTurn',
    chord: 'E  (CTRL+E)',
    keys: ['e'],
    ctrl: false,
    what: 'pass priority until end of turn',
    forge: 'SHORTCUT_ENDTURN = 17 69 — we bind the bare key as well',
    milestone: 'M6',
  },
  {
    id: 'passMyTurn',
    chord: 'T',
    keys: ['t'],
    ctrl: false,
    what: 'pass to my next turn',
    forge: "divergence — Forge's T is SHORTCUT_SHOWTARGETING, and our arrows are always on",
    milestone: 'M6',
  },
  {
    id: 'passBeforeTurn',
    chord: 'B',
    keys: ['b'],
    ctrl: false,
    what: 'pass to just before my turn',
    forge: 'divergence — unbound in Forge',
    milestone: 'M6',
  },
  {
    id: 'alphaStrike',
    chord: 'CTRL+A',
    keys: ['a'],
    ctrl: true,
    what: 'attack with everything',
    forge: 'SHORTCUT_ALPHASTRIKE = 17 65',
    milestone: 'M6',
  },
  {
    id: 'alwaysYes',
    chord: 'Y',
    keys: ['y'],
    ctrl: false,
    what: 'auto-yield: always yes to this ability',
    forge: 'SHORTCUT_AUTOYIELD_ALWAYS_YES = 89',
    milestone: 'M6',
  },
  {
    id: 'alwaysNo',
    chord: 'N',
    keys: ['n'],
    ctrl: false,
    what: 'auto-yield: always no to this ability',
    forge: 'SHORTCUT_AUTOYIELD_ALWAYS_NO = 78',
    milestone: 'M6',
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
  /** An overlay that Escape should close before it reaches the engine. */
  overlay: 'none' | 'zoom' | 'hotkeys';
}

export type KeyPlan =
  | { kind: 'buttonOk' }
  | { kind: 'buttonCancel' }
  /** §5.4 — answering an open ask with `null` is always legal. */
  | { kind: 'answerNull' }
  | { kind: 'concede' }
  | { kind: 'closeOverlay' }
  /** A local view toggle: legal in a replay too, because it sends nothing. */
  | { kind: 'view'; id: KeyActionId }
  /** Bound, understood, and deliberately does nothing yet — with the reason. */
  | { kind: 'inert'; why: string };

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
  const binding = bindingFor(event);
  if (binding === null) return null;
  // A focused button activates itself on Space; sending `buttonOk` as well would
  // answer the engine twice for one press. Escape and the view toggles are not
  // activation keys and stay bound, which is the M3 behaviour this corrects:
  // clicking a card focused its tile, and the whole keyboard went quiet.
  if (binding.id === 'ok' && ownsActivationKeys(event.target)) return null;

  switch (binding.id) {
    case 'ok':
      if (ctx.askOpen) {
        return { binding, plan: { kind: 'inert', why: 'a question is outstanding — answer it first' } };
      }
      if (!ctx.live) return { binding, plan: { kind: 'inert', why: 'this board is read-only' } };
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

    case 'zoom':
    case 'toggleStack':
    case 'toggleCombat':
    case 'toggleLog':
    case 'toggleHotkeys':
      return { binding, plan: { kind: 'view', id: binding.id } };

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

/** The binding for one action id, for a button that wants to print its chord. */
export function chordFor(id: KeyActionId): string {
  return KEYMAP.find((binding) => binding.id === id)?.chord ?? '';
}
