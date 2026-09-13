/*
 * mtg-table — render/Board.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M4: the board that looks like Magic** (report 10 §1, §2).
 *
 * M1 drew every zone as a list of card names. M4 is the same data, laid out as a
 * table: a CSS grid with the opponent's lands and permanents at the top, the
 * middle table with the graveyard strips and the stack, your permanents and
 * lands below, and your hand fanned along the bottom. Two rails: seats, life and
 * the decision panel on the left; the round header and the thirteen phase rows
 * on the right.
 *
 * ---------------------------------------------------------------------------
 * What M4 did NOT change, because M3 got it right and re-deriving it is how a
 * rule that took two verification passes gets lost:
 *
 *   - **`actions` is the seam.** `null` is a replay: every affordance renders,
 *     every affordance is inert, and the board says `Read-only`. Non-null is a
 *     seat. That is the whole of the difference between the two modes, and
 *     `web/test/render.test.tsx` asserts it over the fixture corpus.
 *   - **Never gate a click on `selectable`** (amendment M8). Every card with a
 *     real id is a `<button>` that sends `act: clickCard`; `selectable` drives an
 *     *outline*, because it is the explicit selection set and is empty for the
 *     whole of your own main phase. 78 of 86 clicks in the scripted game are
 *     outside it. Forge is the judge; a click it will not take comes back as
 *     `notice {title: "Not selectable"}`, which the toasts show.
 *   - **`input.buttons.*.label` and `input.prompt` are rendered verbatim**
 *     (`DecisionPanel`), and the acts are `buttonOk` / `buttonCancel`.
 *   - **The stall rule is `wedge.ts`** — six clauses after amendment M21 —
 *     imported by `DecisionPanel`, never re-derived from §4.2's prose.
 *   - **Concede is reachable from every UI state**, including inside an ask.
 *   - **An outstanding `ask` blocks the board's clicks**: the engine is parked
 *     inside that call and is listening for exactly one thing.
 *   - Two shapes the layout must not assume away: an `over` with no `gameOver`
 *     `state` in front of it (M11), and a `seq` that can arrive lower than the
 *     frame before it after a `resync` (M10). Nothing here counts frames or
 *     trusts `seq` for ordering.
 * ---------------------------------------------------------------------------
 *
 * Redaction, in the renderer (hard rule 8, report 10 §18.1):
 *   - every card anywhere goes through the one `CardTile`;
 *   - **the opponent's hand is a count in their rail and is never drawn as
 *     tiles**, even though the cards in it are five-key stubs already;
 *   - a face-down card shows its real face ONLY through `alt`, which the bridge
 *     emits only when `canFaceDownBeShownTo(viewer)` (P3);
 *   - every id is resolved against the frame being rendered and nothing is
 *     cached across frames (P5, `resolve.ts`);
 *   - the running log comes from `reduce()`, not from this component (P20), so
 *     stepping backwards re-derives it.
 *
 * The only effects in this tree are the wedge timer (`DecisionPanel`) and the
 * image `onLoad`/`onError` handlers; `renderToStaticMarkup` runs none of them,
 * which is what lets the render test fold every frame of every fixture.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ArtIndex } from '../art.ts';
import { planKey, type KeyContext, type KeyEventLike } from '../keys.ts';
import {
  buttonFocus,
  isHidden,
  stackYield,
  undoOf,
  type AnswerValue,
  type AnyCard,
  type GameStateBody,
  type InputBody,
  type ManaColor,
  type PlayerState,
  type SetYieldMode,
  type YieldKind,
} from '../protocol.ts';
import type { ClientState, TimestampedNotice } from '../reduce.ts';
import type { View } from '../useView.ts';
import { ArrowsOverlay } from './ArrowsOverlay.tsx';
import { AskModal, defaultDraft, type AskDraft } from './AskModal.tsx';
import type { AskPickerProps } from './AskPicker.tsx';
import type { Clicks } from './CardTile.tsx';
import { CardZoom } from './CardZoom.tsx';
import { CombatBands } from './CombatBands.tsx';
import { ConcedeButton, DecisionPanel, type KeyFlash } from './DecisionPanel.tsx';
import { GameOverBanner } from './GameOver.tsx';
import { HandFan } from './HandFan.tsx';
import { HotkeysOverlay } from './HotkeysOverlay.tsx';
import { isLandTypeLine } from './labels.ts';
import { LogDrawer } from './LogDrawer.tsx';
import { PhaseStrip, type StopTurn } from './PhaseStrip.tsx';
import {
  boardPick,
  drawnEntities,
  toggleChoice,
  viewerSeatId,
  NOTHING_DRAWN,
  TargetingContext,
  type BoardPick,
  type PickCandidate,
  type TargetRef,
  type Targeting,
} from './picker.ts';
import { PlayerRail } from './PlayerRail.tsx';
import { spendableColors } from './pool.ts';
import { cardKey, playerKey, RectsContext, stackKey, useRectRegistry, type RectKey } from './rects.ts';
import { cardLabel, entityLabel, findCard } from './resolve.ts';
import { StackPanel } from './StackPanel.tsx';
import { useWindowKeydown } from './useKeyboard.ts';
import { ZoneBrowser } from './ZoneBrowser.tsx';
import { hintedPanels, panelKey, type ZonePanelRef } from './zones.ts';
import { ZoneRow } from './ZoneRow.tsx';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * The seat's outbound half (§2.2, §2.3). One object, passed down as far as the
 * card tiles; `null` is a replay, and every affordance renders disabled.
 *
 * There is deliberately **no `endTurn`, no `autoPay` and no `cancelYield`**:
 * those are Forge's own labels on the OK and Cancel buttons, and the act to send
 * is `buttonOk` / `buttonCancel` (§2.2, §10.3, report 11 §0.1). `undo` **is**
 * here, and is not an exception to that rule: `IGameController.undoLastAction()`
 * is a real engine call with its own gate (`state.undo.can`), and the engine's
 * Cancel button reaching the same place when it happens to be labelled
 * `Undo (n)` is two controls asking one question, not a second implementation.
 */
export interface BoardActions {
  /** §2.2 — any card, not only a selectable one (amendment M8). */
  clickCard(cardId: number): void;
  clickPlayer(playerId: number): void;
  buttonOk(): void;
  buttonCancel(): void;
  /**
   * §2.2 — `useMana {color}`, `IGameController.useMana(byte)`. **M5's one real
   * dead end**: a state where Forge expects floating mana to be spent could not
   * be resolved from the browser at all before this existed. A colour and
   * nothing else — tapping a land is a `clickCard`.
   */
  useMana(color: ManaColor): void;
  /** §9 invariant 6 — reachable from every UI state, so a wedge is escapable. */
  concede(): void;
  /** §2.3 — exactly one per ask; the value is per-kind (§5.2). */
  answer(askId: string, value: AnswerValue): void;

  // ---- M6. Five acts, five engine calls (report 11), and not one of them a
  // ---- client state machine: every effect comes back as the next `state`.
  /** §2.2 — `undoLastAction()`, gated on `state.undo.can`. Mana abilities only. */
  undo(): void;
  /** §2.2 — `passPriority()`; a no-op unless the engine is asking for one. */
  passPriority(): void;
  /** §2.2 — `alphaStrike()`; only meaningful while declaring attackers. */
  alphaStrike(): void;
  /**
   * §2.2 — `sendYieldUpdate(YieldUpdate)`, in all three of its shapes. `turn`
   * is the marker's column: `END_OF_TURN` on `"opp"` is the opponent's end step
   * ("just before my turn"), on `"own"` my own.
   */
  yieldTo(kind: YieldKind, phase?: string, turn?: StopTurn): void;
  /** §2.2 — `setShouldAutoYield` / `setTriggerDecision`, by opaque handle. */
  setYield(yieldKey: string, mode: SetYieldMode): void;
  /** §2.2 — one bit of `WireGuiGame`'s stop map; `turn`, never a player id. */
  setPhaseStop(phase: string, turn: StopTurn, stop: boolean): void;
  /** §2.2 — `nextGameDecision(CONTINUE | NEW)`. Only meaningful after `over`. */
  newGame(mode: 'continue' | 'restart'): void;
}

export interface BoardProps {
  state: ClientState;
  art: ArtIndex;
  /** M3. `null`/absent → the read-only board. */
  actions?: BoardActions | null;
  /**
   * Client-side complaints from the transport (a dropped click, a socket
   * error). Kept apart from `state.notices`, which are the engine's (§6): a
   * toast that says "not connected" must not look like something Forge said.
   */
  clientNotices?: readonly TimestampedNotice[];
  /**
   * **M6 fix** — is the socket actually `open`? `true`/`false` from a live
   * transport, `null` for a replay (which has no socket and sends nothing).
   *
   * It exists for exactly one control: the New Game row appears at `over`, which
   * is the one moment in a session when the bridge may be about to go away, and
   * a row that offers `act: newGame` into a closed socket produces a toast and
   * nothing else. Every OTHER control on the board is left alone — a click that
   * cannot be sent is already reported by the transport's own notice, and
   * greying the board out on a blip would be the client second-guessing the
   * engine. Never treat this as game state: it is the wire, not the table.
   */
  connected?: boolean | null;
  /**
   * **M7 — `V`, the board's half of the view switch** (report 09 §2.2).
   *
   * `keys.ts` grew two M7 rows in E6 and the `?`/`H` overlay — which only the
   * *board* draws — listed both from the day they were added, but only
   * `arena/Arena.tsx` handled `toggleView`. On the board the key fell into the
   * `view` switch's `default: return`, **after** `event.preventDefault()`, so
   * `V` was swallowed with no act, no flash and no clue: the one renderer that
   * prints the key table was the one renderer in which the key did nothing.
   *
   * `null`/absent leaves it inert, and the key then *says* so rather than being
   * eaten — a replay-only embed and every test render take that path.
   */
  onSetView?: ((view: View) => void) | null;
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export function Board({
  state,
  art,
  actions = null,
  clientNotices = [],
  connected = null,
  onSetView = null,
}: BoardProps): JSX.Element {
  const { board, hello, input } = state;
  const you = hello?.you ?? state.session?.seat ?? null;

  // ---- view state. None of it is game state: every one of these is a panel
  // ---- that is open or shut, and a replay may toggle them all (they send
  // ---- nothing). The keys are Forge's own where Forge has one (`keys.ts`).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stackOpen, setStackOpen] = useState(true);
  const [hotkeysOpen, setHotkeysOpen] = useState(false);
  const [combatEmphasis, setCombatEmphasis] = useState(false);
  const [zoomId, setZoomId] = useState<number | null>(null);
  const [flash, setFlash] = useState<KeyFlash | null>(null);
  const [concedeArmed, setConcedeArmed] = useState(false);

  // ---- M5 view state. Still none of it game state, and still no effect:
  // ---- every one of these is keyed on something the engine sent, so a new
  // ---- ask / a new prompt / a new `openZones` hint discards it by itself.
  //
  // The draft answer to a board-shaped ask (`picker.ts`), keyed by `askId`: a
  // second question can never inherit the first's half-built answer, which is
  // the same rule `AskModal` keeps by remounting on the id.
  const [draftBox, setDraftBox] = useState<{ askId: string; draft: AskDraft } | null>(null);
  // Which zone panels are open, keyed by the `openZones` hint they were opened
  // against (§4.3). No entry, or a stale key, means "follow the engine".
  const [zoneBox, setZoneBox] = useState<{ hint: string; panels: ZonePanelRef[] } | null>(null);
  // What the pointer is over, for the pending-target arrow. Set only by a
  // candidate tile, so an ordinary board carries no pointer handlers at all.
  const [hover, setHover] = useState<TargetRef | null>(null);
  // The last card this seat clicked — the *source* half of the pending arrow.
  //
  // It is needed because the engine does not always say: at `InputSelectTargets`
  // for a spell being cast, `input.focusCardId` is null and the spell is not on
  // the stack yet (measured live, 2026-09-12 — the prompt names the card and the
  // prompt is the ONE thing the client may not parse). So the board remembers
  // the gesture the player made, which is not rules logic and not engine state:
  // it is "the card you clicked". It is only ever *used* while a selection is
  // outstanding, and only if that card still has a tile.
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  // How many clicks this seat has sent against the current `selectable` prompt.
  // The wire carries no running count; this is ours, and the panel says so.
  const [picksBox, setPicksBox] = useState<{ key: string; n: number }>({ key: '', n: 0 });
  // **The snapshot a `useMana` (or an `undo`) was sent against** (M5 review,
  // extended in M6). Forge pushes no `state` for a mana payment — measured in A.I.M. Scientists' landcycling,
  // where the act took `Pay Mana Cost: {2}` to `{1}` and only `input` frames
  // followed — so while `state.board` is still the object we sent against, the
  // pool counts on screen are known to be behind and the rail says so. The
  // reducer replaces `board` wholesale on every `state` frame (reduce.ts), so
  // object identity is exactly the question "has a snapshot arrived since?".
  const [manaSentAgainst, setManaSentAgainst] = useState<GameStateBody | null>(null);

  // ---- the rect registry (report 10 §9.1). One provider, one
  // ---- `ResizeObserver`, on this root; under `renderToStaticMarkup` it
  // ---- measures nothing and the overlay draws nothing.
  const rootRef = useRef<HTMLDivElement>(null);
  const rects = useRectRegistry(rootRef);

  // A flash is a hint, not a state: it says why the last key press did nothing.
  useEffect(() => {
    if (flash === null) return;
    const timer = setTimeout(() => {
      setFlash(null);
    }, 4500);
    return () => {
      clearTimeout(timer);
    };
  }, [flash]);

  // Arming Ctrl+Q from the keyboard must not stay armed all game.
  useEffect(() => {
    if (!concedeArmed) return;
    const timer = setTimeout(() => {
      setConcedeArmed(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [concedeArmed]);

  // ---- M5: is this ask answerable on the board? (`picker.ts` is the whole of
  // ---- the decision, and it is pure.)
  const drawn = useMemo(
    () => (board === null ? NOTHING_DRAWN : drawnEntities(board, you)),
    [board, you],
  );
  const pick: BoardPick | null = useMemo(
    () => (state.ask === null || board === null ? null : boardPick(state.ask, drawn)),
    [state.ask, board, drawn],
  );
  const draft: AskDraft | null =
    state.ask === null
      ? null
      : draftBox !== null && draftBox.askId === state.ask.askId
        ? draftBox.draft
        : defaultDraft(state.ask);
  const setDraft = useCallback(
    (next: AskDraft): void => {
      if (state.ask === null) return;
      setDraftBox({ askId: state.ask.askId, draft: next });
    },
    [state.ask],
  );

  // ---- M5: the zone panels. `openZones` is a hint, never a question (§4.3),
  // ---- so the engine's list is the default and the player's click is an
  // ---- override that lives exactly as long as that hint does.
  const hintPanels = useMemo(() => hintedPanels(input, board, you), [input, board, you]);
  const hintKey = hintPanels.map(panelKey).join('|');
  const followingHint = zoneBox === null || zoneBox.hint !== hintKey;
  const zonePanels = followingHint ? hintPanels : zoneBox.panels;
  const openZone = useCallback(
    (ref: ZonePanelRef): void => {
      setZoneBox({ hint: hintKey, panels: [ref] });
    },
    [hintKey],
  );
  const closeZones = useCallback((): void => {
    setZoneBox({ hint: hintKey, panels: [] });
  }, [hintKey]);

  // The seat whose pool the keyboard spends from — the same seat whose rail
  // carries the live pips.
  const mySeatId = board === null ? null : viewerSeatId(board, you);
  const mySeat = board === null ? null : (board.players.find((p) => p.id === mySeatId) ?? null);
  const poolColors = mySeat === null ? [] : spendableColors(mySeat.manaPool);

  // M6 — the top of the stack is what `Y` / `N` address, which is Forge's own
  // rule (`getGameView().peekStack()`), and `stackYield` is the one place the
  // engine's two guards are read. The handle itself never reaches the DOM.
  const topItem = state.board === null ? null : (state.board.stack.at(-1) ?? null);
  const topYield = stackYield(topItem);

  const keyContext: KeyContext = {
    live: actions !== null && state.gameOver === null,
    askOpen: state.ask !== null,
    okEnabled: input?.buttons.ok.enabled === true,
    cancelEnabled: input?.buttons.cancel.enabled === true,
    haveSelectable: (input?.selectable.cardIds.length ?? 0) > 0,
    poolColors,
    // M6 — every one of these is the engine's own answer, read out of the
    // snapshot: which button it focused, whether it has anything to undo, and
    // whether the top of the stack is something it offers an auto-yield for.
    focus: buttonFocus(input),
    canUndo: undoOf(state.board).can,
    topYieldKey: topYield.yieldKey,
    topYielded: topYield.mode,
    overlay:
      zoomId !== null
        ? 'zoom'
        : hotkeysOpen
          ? 'hotkeys'
          : // An open question outranks a zone panel for `Esc`: §5.4's
            // always-legal `null` is the more important escape hatch, and the
            // panel has its own close button.
            zonePanels.length > 0 && state.ask === null
            ? 'zones'
            : 'none',
  };

  const onKey = useCallback(
    (event: KeyboardEvent): void => {
      const resolved = planKey(asKeyEvent(event), keyContext);
      // §12.2 rule 3: `preventDefault` ONLY for a key we actually consumed.
      // Space scrolls the page otherwise, and swallowing browser shortcuts we
      // do not use is hostile.
      if (resolved === null) return;
      event.preventDefault();
      const { binding, plan } = resolved;

      switch (plan.kind) {
        case 'buttonOk':
          setFlash(null);
          actions?.buttonOk();
          return;
        case 'buttonCancel':
          setFlash(null);
          actions?.buttonCancel();
          return;
        case 'answerNull':
          // §5.4 — always legal; the bridge substitutes Forge's own default.
          if (state.ask !== null) actions?.answer(state.ask.askId, null);
          return;
        case 'concede':
          // §9 invariant 6, with the same two-step the button has: it ends the
          // game and there is no undo for it.
          if (concedeArmed) {
            setConcedeArmed(false);
            setFlash(null);
            actions?.concede();
          } else {
            setConcedeArmed(true);
            setFlash({ id: binding.id, chord: binding.chord, why: 'press again to concede' });
          }
          return;
        case 'useMana':
          // §2.2 — the act the console seat has had since M2 (`m W|U|B|R|G|C`).
          // Same bookkeeping as the pip: no `state` follows a mana payment, so
          // the pool counts are provisional until one does.
          setFlash(null);
          setManaSentAgainst(state.board);
          actions?.useMana(plan.color);
          return;
        // ---- M6. Each of these is one act; the effect arrives as the next
        // ---- `state` / `input`, like every other act (§2.2).
        case 'undo':
          setFlash(null);
          // Same bookkeeping as a mana pip: an undo refunds mana and the engine
          // pushes no `state` for it, so the counts on screen are provisional
          // until one arrives.
          setManaSentAgainst(state.board);
          actions?.undo();
          return;
        case 'passPriority':
          setFlash(null);
          actions?.passPriority();
          return;
        case 'alphaStrike':
          setFlash(null);
          actions?.alphaStrike();
          return;
        case 'yieldTo':
          setFlash(null);
          actions?.yieldTo(plan.yield, plan.phase, plan.turn);
          return;
        case 'setYield':
          setFlash(null);
          actions?.setYield(plan.yieldKey, plan.mode);
          return;
        case 'closeOverlay':
          setZoomId(null);
          setHotkeysOpen(false);
          closeZones();
          return;
        case 'view':
          switch (plan.id) {
            case 'toggleStack':
              setStackOpen((open) => !open);
              return;
            case 'toggleLog':
              setDrawerOpen((open) => !open);
              return;
            case 'toggleHotkeys':
              setHotkeysOpen((open) => !open);
              return;
            case 'toggleCombat':
              setCombatEmphasis((on) => !on);
              return;
            case 'zoom': {
              const id = zoomId !== null ? null : pointedCardId();
              setZoomId(id);
              if (id === null && zoomId === null) {
                setFlash({
                  id: binding.id,
                  chord: binding.chord,
                  why: 'hover or focus a card first — Z zooms the one under the pointer',
                });
              }
              return;
            }
            // **M7 — the board's half of `V`.** It sends nothing and touches
            // neither transport nor reducer: both renderers are functions of the
            // same `ClientState` and `main.tsx` owns it, so a live game survives
            // the switch and a replay keeps its frame.
            case 'toggleView':
              setFlash(null);
              if (onSetView === null) {
                setFlash({
                  id: binding.id,
                  chord: binding.chord,
                  why: 'this board has no arena to switch to',
                });
                return;
              }
              onSetView('arena');
              return;
            // `K` belongs to the arena's cue queue; there is nothing on the
            // board for it to skip. **Say so** rather than swallowing it — a key
            // the `?` overlay lists and the handler eats is exactly the shape of
            // defect this branch exists to stop (report 10 §12.2 rule 4).
            case 'skipCues':
              setFlash({
                id: binding.id,
                chord: binding.chord,
                why: 'K skips the arena’s animations — there are none on the board; press V',
              });
              return;
            default:
              return;
          }
        case 'inert':
          setFlash({ id: binding.id, chord: binding.chord, why: plan.why });
          return;
      }
    },
    // `keyContext` and `state.ask` are read fresh on every render; the listener
    // itself is registered once and reads this through a ref (`useKeyboard.ts`).
    [actions, closeZones, concedeArmed, keyContext, onSetView, state.ask, zoomId],
  );
  useWindowKeydown(onKey);

  // §5: while an ask is outstanding the game thread is parked inside that call
  // and is listening for exactly one thing. A board click then is a click into a
  // void, so the board stops taking them — and says why.
  //
  // **M5 narrows that, it does not widen it.** While a board-shaped ask is
  // outstanding the candidate tiles ARE the control — they answer the question
  // through `TargetingContext` rather than sending an `act` — and every other
  // tile stays inert, because the engine is still listening for exactly one
  // thing.
  const asking = state.ask !== null;

  // M5 — "chosen k of min..max". The wire has no running count (§4 carries the
  // id set and the bounds, nothing else), so this counts what this browser sent
  // since the prompt appeared and the panel labels it as exactly that. It is
  // never enforced anywhere: Forge is the judge (CLAUDE.md §Scope).
  const selKey =
    input === null
      ? ''
      : `${input.prompt}|${input.selectable.mode}|${input.selectable.cardIds.join(',')}` +
        `|${String(input.selectable.min)}-${String(input.selectable.max)}`;
  const picksSent = picksBox.key === selKey ? picksBox.n : 0;
  const countPick = (): void => {
    if (input === null || input.selectable.mode === 'none') return;
    setPicksBox({ key: selKey, n: picksSent + 1 });
  };

  const clicks: Clicks | null =
    actions === null || asking || state.gameOver !== null
      ? null
      : {
          card: (cardId: number) => {
            countPick();
            setLastClicked(cardId);
            actions.clickCard(cardId);
          },
          player: (playerId: number) => {
            countPick();
            actions.clickPlayer(playerId);
          },
        };

  const readOnly = actions === null;

  // ---- M5: the ask that is answered on the board -------------------------
  const answerable = pick !== null && actions !== null && state.gameOver === null;
  const cardOptions = new Map<number, PickCandidate>();
  const playerOptions = new Map<number, PickCandidate>();
  for (const candidate of pick?.candidates ?? []) {
    if (candidate.cardId !== null) cardOptions.set(candidate.cardId, candidate);
    else if (candidate.playerId !== null) playerOptions.set(candidate.playerId, candidate);
  }
  const chosenSet = new Set<number>(
    draft === null
      ? []
      : draft.shape === 'indices'
        ? draft.indices
        : draft.shape === 'index' && draft.index >= 0
          ? [draft.index]
          : [],
  );

  const sendAnswer = (value: AnswerValue): void => {
    if (state.ask === null) return;
    setDraftBox(null);
    setHover(null);
    actions?.answer(state.ask.askId, value);
  };
  const pickOption = (optionId: number): void => {
    if (draft === null || pick === null) return;
    if (draft.shape === 'index') {
      setDraft({ shape: 'index', index: draft.index === optionId ? -1 : optionId });
    } else if (draft.shape === 'indices') {
      // The engine's own `max`, echoed — `max === 1` is a radio button, which
      // is a measurement and not a guess (`picker.ts`).
      setDraft({ shape: 'indices', indices: toggleChoice(draft.indices, optionId, pick.max) });
    }
  };
  const setAmount = (optionId: number, n: number): void => {
    if (draft === null || draft.shape !== 'amounts') return;
    setDraft({ shape: 'amounts', amounts: { ...draft.amounts, [String(optionId)]: n } });
  };

  const targeting: Targeting = {
    option: (kind, id) =>
      (kind === 'card' ? cardOptions.get(id) : playerOptions.get(id)) ?? null,
    candidate: (kind, id) => {
      if (pick !== null) return (kind === 'card' ? cardOptions : playerOptions).has(id);
      if (input === null) return false;
      // No ask: the engine's explicit selection set (§4, amendment M8). It is
      // an outline and a hover target — never a gate on the click.
      if (kind === 'card') {
        return input.selectable.mode === 'cards' && input.selectable.cardIds.includes(id);
      }
      return input.selectable.mode === 'players';
    },
    chosen: (optionId) => chosenSet.has(optionId),
    amount: (optionId) =>
      draft !== null && draft.shape === 'amounts' ? (draft.amounts[String(optionId)] ?? 0) : 0,
    shape: pick?.shape ?? 'none',
    live: answerable,
    pick: pickOption,
    setAmount,
    hover: setHover,
  };

  const askPicker: AskPickerProps | null =
    pick === null || state.ask === null || draft === null || board === null
      ? null
      : {
          ask: state.ask,
          pick,
          draft,
          board,
          art,
          live: answerable,
          onDraft: setDraft,
          onAnswer: sendAnswer,
          onPick: pickOption,
          onAmount: setAmount,
        };

  if (board === null) {
    return (
      <div className="board board--empty" data-readonly={readOnly ? 'true' : 'false'}>
        <div className="board__empty">
          <p className="muted">
            No <code>state</code> frame yet — step forward, press play, or wait for the bridge.
          </p>
          {readOnly && <span className="pill pill--readonly">Read-only</span>}
          {actions !== null && (
            <ConcedeButton onConcede={actions.concede} gameOver={state.gameOver !== null} />
          )}
        </div>
        {/* No board means no tiles, so every ask is a modal here by
            construction — `boardPick` returns null with no snapshot. */}
        <AskModal ask={state.ask} art={art} onAnswer={actions?.answer ?? null} />
        <Toasts notices={state.notices} clientNotices={clientNotices} />
        <div className="board__drawer">
          <LogDrawer
            state={state}
            board={null}
            clientNotices={clientNotices}
            open={drawerOpen}
            onToggle={() => {
              setDrawerOpen((wasOpen) => !wasOpen);
            }}
          />
        </div>
      </div>
    );
  }

  const seats = orderSeats(board.players, you);
  const opponents = seats.filter((p) => you === null || p.id !== you);
  const mine = you === null ? seats[0] : seats.find((p) => p.id === you);
  const opponent = opponents[0];
  // Resolved against THIS frame, like every other id (P5, `resolve.ts`): a card
  // that left the board while its zoom was open closes the zoom rather than
  // keeping a picture of something that is no longer there.
  const zoomCard = zoomId === null ? undefined : findCard(board, zoomId);

  // M5 — the tail of the pending-target arrow: what the engine says this
  // choice is about. The head is whatever candidate the pointer is over, and
  // both ends must be on the board or `pendingArrow` draws nothing (§9.2).
  const selecting = pick !== null || (input !== null && input.selectable.mode !== 'none');
  const pendingFrom: RectKey | null =
    !selecting
      ? null
      : state.ask !== null && state.ask.kind === 'assign_damage' && state.ask.attackerId !== null
        ? // §5.3 — the attacker whose damage is being assigned.
          cardKey(state.ask.attackerId)
        : input !== null && input.focusCardId !== null
          ? // §4 — the card the engine says the prompt is about.
            cardKey(input.focusCardId)
          : board.stack.length > 0
            ? stackKey(board.stack[board.stack.length - 1]!.id)
            : lastClicked !== null
              ? // The gesture, when the engine named nothing: the card you
                // clicked to start this. A missing rect drops the arrow, which
                // is what happens the moment that card leaves the board.
                cardKey(lastClicked)
              : null;
  //
  // **The hover is only a target while it is still a candidate.** A tile that
  // leaves the board under the pointer — the card you just clicked to discard —
  // fires no `mouseleave`, because React unmounts it rather than moving it, so
  // the last hover would otherwise keep an arrow pointing at a card that is now
  // in the graveyard. Measured in the browser, 2026-09-12. Re-asking the same
  // question the outline asks is also exactly right: an arrow may only end on
  // something the engine is currently offering.
  const pendingTo: RectKey | null =
    hover === null || !targeting.candidate(hover.kind, hover.id)
      ? null
      : hover.kind === 'card'
        ? cardKey(hover.id)
        : playerKey(hover.id);

  // **Not a hook.** This sits below the `board === null` early return above, and
  // a `useMemo` here changes the hook count between the empty board and the real
  // one — "Rendered more hooks than during the previous render", caught in the
  // browser on frame 3 and invisible to `render.test.tsx`, which mounts each
  // frame fresh rather than re-rendering one component. A fresh closure per
  // render costs nothing: `PlayerRail` is not memoised either.
  const spendMana: ((color: ManaColor) => void) | null =
    actions !== null && !asking && state.gameOver === null
      ? (color: ManaColor): void => {
          setManaSentAgainst(state.board);
          actions.useMana(color);
        }
      : null;
  // The panel's Undo does the same bookkeeping the pips do — see below.
  const panelActions: BoardActions | null =
    actions === null
      ? null
      : {
          ...actions,
          undo: () => {
            setManaSentAgainst(state.board);
            actions.undo();
          },
        };

  // Still the snapshot we spent against → no `state` has arrived since.
  //
  // **M6 measured the same shape for `undo`** (docs/evidence/m6-board.md): the
  // act is applied — Forge's own Cancel goes straight from `Undo (1)` back to
  // `End Turn`, through the `input` it does push — but no snapshot follows, so
  // `state.undo` and `manaPool` are a frame behind until the next one. The pips
  // and the Undo button both say so rather than showing a stale number as fact.
  const manaProvisional = manaSentAgainst !== null && manaSentAgainst === state.board;

  return (
    <RectsContext.Provider value={rects}>
    <TargetingContext.Provider value={targeting}>
    <div className="board" data-readonly={readOnly ? 'true' : 'false'} ref={rootRef}>
      {/* ---- left rail: the seats and the decision -------------------------- */}
      <aside className="board__rail board__rail--left">
        {readOnly && (
          <span className="pill pill--readonly" title="a replay has no server to send an act to">
            Read-only
          </span>
        )}
        {opponents.map((player) => (
          <PlayerRail
            key={player.id}
            player={player}
            you={you}
            board={board}
            input={input}
            art={art}
            clicks={clicks}
            onBrowseLibrary={() => {
              openZone({ playerId: player.id, zone: 'library' });
            }}
          />
        ))}
        {mine !== undefined && (
          <PlayerRail
            player={mine}
            you={you}
            board={board}
            input={input}
            art={art}
            clicks={clicks}
            // M5 — the pips are controls on YOUR rail only, and only while the
            // engine is not parked inside an ask (§2.2, `pool.ts`).
            onSpendMana={spendMana}
            manaProvisional={manaProvisional}
            onBrowseLibrary={() => {
              openZone({ playerId: mine.id, zone: 'library' });
            }}
          />
        )}
        <DecisionPanel
          state={state}
          board={board}
          you={you}
          input={input}
          art={art}
          actions={panelActions}
          connected={connected}
          clicks={clicks}
          flash={flash}
          manaProvisional={manaProvisional}
          askPicker={askPicker}
          picksSent={picksSent}
          onHotkeys={() => {
            setHotkeysOpen((open) => !open);
          }}
        />
        {concedeArmed && (
          <p className="hint hint--loud" role="status">
            CTRL+Q again to concede.
          </p>
        )}
        <div className="board__drawer">
          <LogDrawer
            state={state}
            board={board}
            clientNotices={clientNotices}
            open={drawerOpen}
            onToggle={() => {
              setDrawerOpen((wasOpen) => !wasOpen);
            }}
          />
        </div>
      </aside>

      {/* ---- the table ------------------------------------------------------ */}
      <main className="table">
        <Seat
          player={opponent}
          board={board}
          input={input}
          art={art}
          clicks={clicks}
          you={you}
          side="opponent"
        />

        <div className="table__middle">
          <SeatStrips
            player={opponent}
            input={input}
            art={art}
            clicks={clicks}
            you={you}
            onBrowse={openZone}
          />
          <SeatStrips
            player={mine}
            input={input}
            art={art}
            clicks={clicks}
            you={you}
            onBrowse={openZone}
          />
          <StackPanel
            board={board}
            input={input}
            art={art}
            clicks={clicks}
            you={you}
            open={stackOpen}
            onToggle={() => {
              setStackOpen((open) => !open);
            }}
            // M6 — `act: setYield`. Live whenever the seat is (an outstanding
            // `ask` is no reason to refuse one: Forge's own `setTriggerDecision`
            // answers the question in front of you as well as the later ones,
            // report 11 §5.1), and `null` in a replay, where the badges still
            // render and send nothing.
            onSetYield={
              actions === null || state.gameOver !== null
                ? null
                : (yieldKey, mode) => {
                    actions.setYield(yieldKey, mode);
                  }
            }
          />
          {/* M5 — what has been declared so far, from `combat.bands` only.
              It is a child of `.table__middle` but NOT a row of it: the strip is
              positioned, anchored to the middle's bottom edge beside the stack
              panel (`styles.css`, `.bands`). Mounted in the flow it landed in an
              implicit third grid row and starved the two `1fr` strip rows to
              0 px at 1600 × 900 — `docs/evidence/m5-board.md` §6. */}
          <CombatBands board={board} input={input} art={art} clicks={clicks} you={you} />
          <Toasts notices={state.notices} clientNotices={clientNotices} />
          {/* M6 — "Your turn" is a tint over the table, not a fortieth toast. */}
          <TurnFlash state={state} />
          {state.gameOver !== null && <GameOverBanner state={state} />}
        </div>

        <Seat
          player={mine}
          board={board}
          input={input}
          art={art}
          clicks={clicks}
          you={you}
          side="you"
        />

        <div className="table__hand">
          <HandFan
            cards={mine?.zones.hand.cards ?? []}
            count={mine?.zones.hand.count ?? 0}
            input={input}
            art={art}
            clicks={clicks}
          />
        </div>
      </main>

      {/* ---- right rail: the phase strip ------------------------------------ */}
      {/* M6 — the dots are toggles now. They send `act: setPhaseStop` and read
          `players[].phaseStops`; the board still computes no stop of its own
          (**D31**). Inert inside an `ask` for the same reason every other act
          is: the game thread is parked and is listening for one thing. */}
      <PhaseStrip
        board={board}
        you={you}
        onSetPhaseStop={
          actions === null || asking || state.gameOver !== null
            ? null
            : (phase, turn, stop) => {
                actions.setPhaseStop(phase, turn, stop);
              }
        }
      />

      {/* §9.3 — one SVG over the whole board, `aria-hidden` and
          `pointer-events: none`. Every fact it draws is also text: the stack
          panel's target chips and the tiles' combat notes (§14 rule 4). */}
      <ArrowsOverlay
        board={board}
        emphasiseCombat={combatEmphasis}
        pendingFrom={pendingFrom}
        pendingTo={pendingTo}
      />

      {/* §5 — the game thread is parked inside this call, so it draws over
          everything: an outstanding question is the single most important thing
          on the board while it exists.
          **M5**: only when the board cannot express it. A board-shaped ask is
          answered on the tiles, with the prompt and the buttons in the decision
          panel; the modal remains for colours, modes, numbers, text, and every
          card in a zone this board is not drawing (`picker.ts`). */}
      <AskModal ask={pick === null ? state.ask : null} art={art} onAnswer={actions?.answer ?? null} />

      {/* M5 — the zone browser (`zones.ts`). Opened by a strip's caption, or
          by `input.openZones`, which is a view hint and reveals nothing (§4.3). */}
      <ZoneBrowser
        panels={zonePanels}
        board={board}
        you={you}
        art={art}
        clicks={clicks}
        fromHint={followingHint}
        onClose={closeZones}
      />

      {zoomCard !== undefined && (
        <CardZoom
          card={zoomCard}
          art={art}
          input={input}
          mine={!isHidden(zoomCard) && you !== null && zoomCard.controller === you}
          onClose={() => {
            setZoomId(null);
          }}
        />
      )}
      {hotkeysOpen && (
        <HotkeysOverlay
          onClose={() => {
            setHotkeysOpen(false);
          }}
        />
      )}
    </div>
    </TargetingContext.Provider>
    </RectsContext.Provider>
  );
}

/**
 * A `KeyboardEvent` as `keys.ts` reads it (that module takes no DOM types, so it
 * can be imported from `node --test`).
 */
function asKeyEvent(event: KeyboardEvent): KeyEventLike {
  const target = event.target as (HTMLElement & { isContentEditable?: boolean }) | null;
  return {
    key: event.key,
    code: event.code,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    isComposing: event.isComposing,
    // A DOM element always has `tagName`; an event dispatched at `window` has a
    // target with none at all, which is the shape that used to throw here.
    target:
      target === null
        ? null
        : {
            tagName: typeof target.tagName === 'string' ? target.tagName : undefined,
            isContentEditable: target.isContentEditable === true,
          },
  };
}

/**
 * The card `Z` should zoom: the one under the pointer, else the focused one
 * (Forge's `SHORTCUT_CARD_ZOOM` zooms "the currently selected card").
 *
 * `:hover` is a real CSS selector and the browser already knows the answer, so
 * this needs no mouse-tracking state of its own — which is the whole reason the
 * board has no `onMouseEnter` handler on eighty tiles.
 */
function pointedCardId(): number | null {
  if (typeof document === 'undefined') return null;
  let element: Element | null = null;
  try {
    element = document.querySelector('.tile:hover');
  } catch {
    element = null;
  }
  if (element === null) {
    const active = document.activeElement;
    element = active === null ? null : active.closest('.tile');
  }
  const raw = element?.getAttribute('data-card-id') ?? null;
  if (raw === null) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

// ---------------------------------------------------------------------------
// One seat's two rows: permanents above lands for you, lands above permanents
// for the opponent — the way a table looks from your chair.
// ---------------------------------------------------------------------------

function Seat({
  player,
  board,
  input,
  art,
  clicks,
  you,
  side,
}: {
  player: PlayerState | undefined;
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  you: number | null;
  side: 'you' | 'opponent';
}): JSX.Element {
  const mine = side === 'you';
  const split = useMemo(() => splitBattlefield(board, player), [board, player]);
  const notes = useMemo(() => combatNotes(board), [board]);
  const noteFor = (card: AnyCard): string | null => notes.get(card.id) ?? null;
  const attachmentsFor = (hostId: number): AnyCard[] => split.attachments.get(hostId) ?? [];
  const who = player?.name ?? (mine ? 'you' : 'opponent');

  const lands = (
    <ZoneRow
      cards={split.lands}
      kind="land"
      label={`${who} · lands`}
      input={input}
      art={art}
      clicks={clicks}
      mine={mine}
      zoom={mine ? 'up' : 'down'}
      attachmentsFor={attachmentsFor}
      noteFor={noteFor}
    />
  );
  const permanents = (
    <ZoneRow
      cards={split.permanents}
      kind="bf"
      label={`${who} · permanents`}
      input={input}
      art={art}
      clicks={clicks}
      mine={mine}
      zoom={mine ? 'up' : 'down'}
      attachmentsFor={attachmentsFor}
      noteFor={noteFor}
    />
  );

  return (
    <div className={`table__seat table__seat--${side}`} data-seat={player?.id ?? 'none'}>
      {/* The opponent's lands sit furthest from you and their permanents nearest,
          which is what a table looks like across a table (report 10 §2.4). */}
      {side === 'opponent' ? (
        <>
          <div className="table__row table__row--lands">{lands}</div>
          <div className="table__row table__row--perms">{permanents}</div>
        </>
      ) : (
        <>
          <div className="table__row table__row--perms">{permanents}</div>
          <div className="table__row table__row--lands">{lands}</div>
        </>
      )}
      <span className="sr-only">
        {who}: {split.permanents.length} permanents, {split.lands.length} lands
        {you !== null && player?.id === you ? ' (yours)' : ''}
      </span>
    </div>
  );
}

/**
 * The graveyard and exile strips for one seat, in the middle row.
 *
 * **M5**: each strip's caption opens the zone browser. The strips themselves are
 * unchanged — 45 px, shingled, every card through `CardTile` — because they are
 * the at-a-glance reading and the panel is the readable one.
 */
function SeatStrips({
  player,
  input,
  art,
  clicks,
  you,
  onBrowse,
}: {
  player: PlayerState | undefined;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  you: number | null;
  onBrowse?: (ref: ZonePanelRef) => void;
}): JSX.Element {
  if (player === undefined) return <div className="middle__strips" />;
  const mine = you !== null && player.id === you;
  const browse = (zone: ZonePanelRef['zone']): (() => void) | null =>
    onBrowse === undefined ? null : () => { onBrowse({ playerId: player.id, zone }); };
  return (
    <div className={`middle__strips${mine ? ' middle__strips--you' : ''}`}>
      <ZoneRow
        cards={player.zones.graveyard.cards}
        kind="strip"
        label={`${player.name} · graveyard`}
        input={input}
        art={art}
        clicks={clicks}
        mine={mine}
        zoom={mine ? 'up' : 'down'}
        align="start"
        onOpen={browse('graveyard')}
      />
      {player.zones.exile.cards.length > 0 && (
        <ZoneRow
          cards={player.zones.exile.cards}
          kind="strip"
          label={`${player.name} · exile`}
          input={input}
          art={art}
          clicks={clicks}
          mine={mine}
          zoom={mine ? 'up' : 'down'}
          align="start"
          onOpen={browse('exile')}
        />
      )}
      {player.zones.command.cards.length > 0 && (
        <ZoneRow
          cards={player.zones.command.cards}
          kind="strip"
          label={`${player.name} · command`}
          input={input}
          art={art}
          clicks={clicks}
          mine={mine}
          zoom={mine ? 'up' : 'down'}
          align="start"
          onOpen={browse('command')}
        />
      )}
      {/* M4 printed "N attacking bands — see the log drawer" here. M5 draws the
          bands themselves, once, in `<CombatBands/>`, which is positioned over
          the bottom of the middle rather than stacked under them. */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Battlefield partitioning (report 10 §3.3)
// ---------------------------------------------------------------------------

interface Split {
  lands: AnyCard[];
  permanents: AnyCard[];
  /** host card id → the Auras / Equipment hoisted into its tile (§4.4). */
  attachments: Map<number, AnyCard[]>;
}

/**
 * Split one seat's battlefield into the two rows, and hoist attachments.
 *
 * The land/permanent split is a **presentation bucket** over `card.types` —
 * Forge's `CardType.toString()` verbatim, plain hyphen and all (§10.4) — exactly
 * like a phase label. It never affects what is clickable, and a creature-land
 * (matching both) goes in the permanents row, which is a layout choice and not a
 * rules one.
 *
 * An attachment is looked up **across both seats**, because an Aura on the
 * opponent's creature lives in the caster's `attachmentIds` but must draw on the
 * opponent's row. If the host does not resolve — hidden, or gone — the
 * attachment falls back to a standalone tile. Never drop it.
 */
function splitBattlefield(board: GameStateBody, player: PlayerState | undefined): Split {
  const attachments = new Map<number, AnyCard[]>();
  const hoisted = new Set<number>();

  for (const seat of board.players) {
    for (const card of seat.zones.battlefield.cards) {
      if (isHidden(card) || card.attachedToId === null) continue;
      const host = hostOnBattlefield(board, card.attachedToId);
      if (host === null) continue;
      const list = attachments.get(host) ?? [];
      list.push(card);
      attachments.set(host, list);
      hoisted.add(card.id);
    }
  }

  const lands: AnyCard[] = [];
  const permanents: AnyCard[] = [];
  for (const card of player?.zones.battlefield.cards ?? []) {
    if (hoisted.has(card.id)) continue;
    const types = isHidden(card) ? '' : card.types;
    if (types !== '' && isLandTypeLine(types) && !/Creature/.test(types)) lands.push(card);
    else permanents.push(card);
  }
  return { lands, permanents, attachments };
}

/** The host id, but only when the host is really on a battlefield row. */
function hostOnBattlefield(board: GameStateBody, hostId: number): number | null {
  for (const seat of board.players) {
    const hit = seat.zones.battlefield.cards.find((card) => card.id === hostId);
    if (hit !== undefined) return hit.id;
  }
  return null;
}

/**
 * One line of already-resolved combat text per card, so a tile can say what it
 * is doing without the reader chasing the combat panel. Every fact the arrows
 * will draw in evening 3 is also text (§14 rule 4) — this is the first half of
 * that, and `board.combat` is `null` outside a combat phase, which this is total
 * over.
 */
function combatNotes(board: GameStateBody): Map<number, string> {
  const notes = new Map<number, string>();
  for (const band of board.combat?.bands ?? []) {
    const defender = entityLabel(board, band.defender);
    for (const attacker of band.attackerIds) notes.set(attacker, `→ ${defender}`);
    for (const blocker of band.blockerIds) {
      notes.set(blocker, `blocks ${band.attackerIds.map((id) => cardLabel(board, id)).join(', ')}`);
    }
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Small pieces kept from M1/M3
// ---------------------------------------------------------------------------

/** The viewer's own seat at the bottom: opponent(s) on top, you below. */
function orderSeats(players: PlayerState[], you: number | null): PlayerState[] {
  if (you === null) return players;
  return [...players.filter((p) => p.id !== you), ...players.filter((p) => p.id === you)];
}

/**
 * Is it this seat's move? Derived from the snapshot the engine sent — `priority`
 * is a player id (§3.1) — and nothing else. It decides what a toast says, never
 * what is legal (§9 invariant 8).
 */
function yourTurn(state: ClientState): boolean {
  const you = state.hello?.you ?? state.session?.seat ?? null;
  return (
    you !== null &&
    state.board !== null &&
    state.board.priority === you &&
    state.gameOver === null &&
    state.ask === null
  );
}


/**
 * The toast strip: what the engine complained about (§6) and what the transport
 * complained about, and — **as of M6** — nothing else.
 *
 * **Only `warn` and `error` are toasts.** The corpus is the argument: 952 of the
 * 1,000-odd notices across `fixtures/games/` are `info` / `"Your turn"`, pushed
 * at every priority pass, and a strip that says the same three words forty times
 * a turn is a strip nobody reads — including the 21 `warn` / "Not selectable"
 * lines that are the whole reason it exists. The filter is on `level`, which is
 * a typed field (§6), and **never on the title**: deciding what a control does
 * by matching an engine string is what amendment M30 forbids.
 *
 * `info` is not lost — the log drawer lists every notice, unfiltered, and that
 * is where "a toast that disappears is not the only copy" is satisfied.
 *
 * "Your turn" became {@link TurnFlash}, which says the same thing from the
 * *snapshot* (`state.priority`) rather than from a notice.
 *
 * Capped and newest-first, and **briefly** is done in CSS (`animation:
 * toast-fade`) rather than with a timer, because a timer here would be an effect
 * the render test cannot run.
 */
function Toasts({
  notices,
  clientNotices,
}: {
  notices: TimestampedNotice[];
  clientNotices: readonly TimestampedNotice[];
}): JSX.Element | null {
  const loud = [...notices, ...clientNotices].filter(
    (notice) => notice.level === 'warn' || notice.level === 'error',
  );
  const recent = collapse(loud).slice(-3);
  if (recent.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {recent.map(({ notice, count }) => (
        <span key={`${String(notice.seq)}-${String(notice.t)}`} className={`toast toast--${notice.level}`}>
          {/* §6: both strings are gated and either may be "" — render verbatim
              and be total over an empty one. */}
          {notice.title !== '' && <strong>{notice.title}</strong>}
          {notice.title !== '' && notice.text !== '' && ' '}
          {notice.text}
          {count > 1 && <span className="muted"> ×{count}</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * **M6 — "Your turn" is a flash, not a toast.**
 *
 * It is the same fact it always was — `state.priority` is this seat, the game is
 * live and nothing is being asked (`yourTurn()`) — drawn as a brief tint across
 * the table rather than as a card in the toast strip. Three reasons, all of them
 * measured: Forge pushes the notice at *every* priority pass (952 of them in the
 * committed corpus), the strip is where `warn` / `error` have to be legible, and
 * a message that repeats forty times a turn stops being read.
 *
 * Keyed on the turn and the phase so the CSS animation restarts when the fact is
 * new and not on every re-render, and `aria-hidden` because the same fact is
 * already in the phase strip's header, the decision panel's title and the
 * engine's own prompt — this is decoration over information that is already
 * there (§14 rule 4).
 */
function TurnFlash({ state }: { state: ClientState }): JSX.Element | null {
  if (!yourTurn(state)) return null;
  const board = state.board;
  return (
    <span
      key={`${String(board?.turn ?? 0)}-${board?.phase ?? ''}`}
      className="turnflash"
      aria-hidden="true"
      data-turn={String(board?.turn ?? 0)}
    />
  );
}

/**
 * Collapse a run of identical notices into one, with a count.
 *
 * Forge repeats itself: it pushes `notice{title:"Your turn"}` at every priority
 * it hands back, and five identical toasts in a row is a strip that stops being
 * read. The drawer still lists every one of them individually — this is
 * presentation, not filtering, and the strings are never rewritten (§6).
 */
function collapse(
  notices: readonly TimestampedNotice[],
): Array<{ notice: TimestampedNotice; count: number }> {
  const out: Array<{ notice: TimestampedNotice; count: number }> = [];
  for (const notice of notices) {
    const last = out[out.length - 1];
    if (
      last !== undefined &&
      last.notice.level === notice.level &&
      last.notice.title === notice.title &&
      last.notice.text === notice.text
    ) {
      // Keep the LATEST of the run, so the fade animation restarts on a repeat.
      out[out.length - 1] = { notice, count: last.count + 1 };
      continue;
    }
    out.push({ notice, count: 1 });
  }
  return out;
}
