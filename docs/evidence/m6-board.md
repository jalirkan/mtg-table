# M6 evidence — the board side: comfort, as engine features rendered

What was actually run, on **2026-09-12**, with real numbers. This is the **board
half** of M6 (`PLAN.md` §M6 and "What M5 hands to M6", and
[`docs/research/11-engine-comfort-features.md`](../research/11-engine-comfort-features.md)):
the phase strip going live, Pass-To, auto-yield, Undo, New Game, the keyboard,
and the toasts. The bridge half — `WireGuiGame`'s stop map, the yield handles,
`HostedMatch.continueMatch`, the new fixtures — is
[`m6-engine.md`](m6-engine.md); this file cites it where the two halves meet.

**The thesis is PLAN's own sentence**, and every section below is an instance of
it: *every one of these is an engine feature rendered, not a client state
machine*. The board still computes nothing. A phase-stop dot draws
`players[].phaseStops` and sends an act; a yield line draws `state.yield`; the
Undo button draws `state.undo`; an auto-yield badge draws `stack[].yielded`. Not
one of them remembers anything between frames.

---

## 0. What shipped

| File | Lines | What changed |
|---|---:|---|
| `web/src/protocol.ts` | 1,698 (+281) | §10 promoted into live types: `PhaseStops`, `YieldState`, `UndoState`, `ButtonFocus`, `stack[]`'s four fields, the acts `yieldTo` / `newGame` / the re-keyed `setPhaseStop` / `setYield`'s three modes — plus the five **readers** (`phaseStopsOf`, `yieldOf`, `undoOf`, `buttonFocus`, `stackYield`) that turn "the field is absent" into "this recording predates M6" in one place |
| `web/src/reduce.ts` | 508 (+73) | `applyHello`: a `hello_ok` whose `gameId` changed drops the finished game; `gameNumber`; `gameLabel` |
| `web/src/keys.ts` | 667 (+227) | SPACE follows `input.buttons.focus`; the `P` row; six M6 rows that send acts instead of flashing a milestone; `KeyContext` gains `focus`, `canUndo`, `topYieldKey`, `topYielded` |
| `web/src/render/PhaseStrip.tsx` | 262 (+187/−84) | the dots are toggles; the marker glyph; the yield line; **the hold-priority button is gone** |
| `web/src/render/DecisionPanel.tsx` | 723 (+350) | `PassToRow`, `UndoButton`, `NewGameRow`, the focused-button ring |
| `web/src/render/StackPanel.tsx` | 236 (+112) | `YieldControls` — Always yes / Always no / clear, per stack item |
| `web/src/render/Board.tsx` | 1,364 (+200) | seven new acts on `BoardActions`; the M6 key plans; the strip and stack wiring; `Toasts` filtered to `warn`/`error`; `TurnFlash` |
| `web/src/render/HotkeysOverlay.tsx` | 66 (−23) | the "not yet" column is empty, so its styling is gone |
| `web/src/main.tsx` | 582 (+42) | the seven acts on the wire; the game label in the bar |
| `web/src/styles.css` | 2,773 (+155) | the M6 block; `.pill--later` / `.hotkeys__later` deleted |
| `web/test/board-m6.test.tsx` | 606 | **new** — 15 tests (§8) |
| `web/test/reduce.test.ts` | +231 | the per-game reset, `gameLabel`, the readers, and "every M6 field is optional" |
| `web/test/keys.test.ts` | +143 | SPACE → focus, the six act keys, the read-only / ask gates |
| `web/test/human-seat.test.ts` | +49 | the per-file "has an ask" assertion became a corpus-level one (§9) |

`npm run build`: **zero TypeScript errors**, `dist/assets/index-*.js` 269.61 kB
(gzip 83.77). `npm test`: **425 `node --test` + 72 vitest, 0 failures, 0
skipped**.

---

## 1. Phase stops: the dots are live, and the engine really stops

The M4 strip drew Forge's documented defaults, disabled, and said so (**D31**).
M6 changed two things and nothing else: where the fill comes from
(`players[].phaseStops`, the promoted §3.3 `{own, opp}` shape) and what a click
does (`act: setPhaseStop {phase, turn, stop}`).

**Measured live** (bridge on 8660, board on 5180, `--games 3 --seed 42`):

| step | what the wire carried |
|---|---|
| the board at the first prompt | 24 dots, all enabled; `MAIN1:own` filled, `END_OF_TURN:opp` filled — Forge's own defaults, **read off `players[].phaseStops`**, not off `labels.ts` |
| click the `DRAW` / own dot | `c2s act {"action":"setPhaseStop","phase":"DRAW","stop":true,"turn":"own"}` |
| the next `state` | the dot came back **filled** (`data-stop="on"`), and nothing in the client had changed it in between — the click sends, the snapshot decides |
| turn 3 (my second turn) | the engine gave me priority at **`Your draw step`**, which it does not do by default (`PHASE_HUMAN_DRAW` is `false`, report 11 §3.2) |

That last row is the whole feature: the act reached `WireGuiGame`'s map and
**changed what the engine did**, not what the browser drew.

Two more facts the run pinned:

- **A stop is per game.** Game 2's first `state` came back with the *seeded*
  map (`own: [MAIN1, COMBAT_DECLARE_BLOCKERS, MAIN2]`) — the `DRAW` stop from
  game 1 was gone, which is report 11 §8.3's reset list doing what it says.
  Toggling `DRAW` again in game 2 stopped the engine at my draw step again.
- **There is no client-side echo, and it no longer costs anything.** Between the
  click and the next `state` the dot does not move — the alternative is a client
  that remembers its own stops, which `CLAUDE.md` §Scope forbids. The first
  version of this file measured that gap at **~30 s** in the play-or-draw
  prompt, because no snapshot is pushed while the engine sits in a question.
  **That is stale**: `WireGuiGame.refreshState()` now pushes one for exactly
  these four acts. **Re-measured 2026-09-12 against the current bridge**, in the
  same play-or-draw prompt: `c2s act {setPhaseStop, DRAW, own, true}` at
  `t=…850917`, `s2c state` seq 7 at `t=…850919` with
  `phaseStops.own = [DRAW, MAIN1, COMBAT_DECLARE_BLOCKERS, MAIN2]` — **2 ms**.
  The push is guarded (**D39**) and *skips* rather than races when the engine is
  running; in this whole browser session the bridge reported
  `refresh skips = 0`, because a human presses these controls while the engine
  is parked waiting for them. Over a socket, where a scripted client fires an act
  the moment a frame arrives, the same run reported 2 skips out of 4 and the
  slowest act-to-`state` was 217 ms (a `yieldTo`), the other three 0–3 ms.

The legend now reads *"● stop · ○ pass · · no pref — left dot: your turn, right
dot: theirs. Click one — the engine answers with the next state."*; a stream
with no `phaseStops` (every pre-M6 recording, and every replay) still draws the
dots, disabled, and says *"Forge defaults (this stream sends no stops)"*.

**The hold-priority button is deleted**, markup, styles and all. Forge has no
such feature (report 11 §0, §10.4) and a toggle with no engine behind it is the
client-side rules logic the whole architecture exists to avoid.

---

## 2. Pass-To, and the defect the browser found

Three buttons, one act, three engine mechanisms (report 11 §4.1) — and the live
run caught a real bug in the third one.

| button | act sent | `state.yield` that came back |
|---|---|---|
| End of turn (`E`) | `{action:"yieldTo",kind:"endOfTurn"}` | `{kind:"endOfTurn",playerId:0,phase:null}` at seq 75, 78 |
| My next turn (`T`) | `{kind:"marker",phase:"UPKEEP",turn:"own"}` | a marker on my own upkeep |
| Before my turn (`B`) | `{kind:"marker",phase:"END_OF_TURN",turn:"opp"}` | `{kind:"marker",playerId:1,phase:"END_OF_TURN"}` at seq 92 |

**The defect.** The first version sent `{kind:"marker",phase:"END_OF_TURN"}`
with no `turn`, exactly as the contract's act table spells it — and the bridge,
whose `markerOwner` defaults to the viewer, came back with
`state.yield {kind:"marker", playerId:0, phase:"END_OF_TURN"}` (seq 52). That is
a marker on **my own** end step: it would have skipped the rest of the
opponent's turn *and my entire turn* to land on my end step. A marker is a
per-(player, phase) cell, so the phase name alone cannot say which one; the act
now carries `turn`, the same two words `setPhaseStop` uses, and the second run
produced `playerId: 1` — the opponent's end step, which is what "just before my
turn" means. `web/test/keys.test.ts` pins both plans with their `turn`.

**A running yield renders in three places**, measured by polling the DOM every
120 ms after pressing End of turn at my draw step:

- the decision panel: *"**Yielding** until the end of this turn — the engine
  keeps **Cancel** enabled above for as long as it runs; that is the way out
  (there is no separate act for it)"*;
- the phase strip: *"⏩ passing until the end of this turn — press the engine's
  Cancel to stop"*, and for a marker a `⏩` on the marked cell itself;
- the three pass-to buttons, **disabled** while one runs.

And the engine's own Cancel button was live beside them, labelled `Cancel` by
`InputLockUI` — which is why there is no `cancelYield` act and must not be one.

`P` is `act: passPriority`, which the jar defines as "press OK **if** the
current input is `InputPassPriority`". It is bound and rendered as its own
button because that conditional is the whole point: it is a no-op everywhere
else, unlike `buttonOk`.

---

## 3. Auto-yield: the handle goes on the wire and never on the page

`stack[].yieldKey` is a bridge-minted handle (`"y1"`, `"y4"`, `"y9"`) standing
in for a string that is literally a card name, its zone, its id and its rules
text (report 11 §5.2). The board **never renders it**.

Measured in the live game, on the AI's equip ability and then on the three
*attacks-alone* triggers the deck is full of:

| moment | what happened |
|---|---|
| `Super Suit (80) - Attach to Peggy Carter…` on the stack | the item grew `Auto-yield` / `Never`, with the `Y` / `N` chords on the **top** item only (Forge's own `peekStack` rule) |
| pressed the `yes` button | `c2s act {"action":"setYield","mode":"yes","yieldKey":"y4"}` |
| the next snapshot (seq 196) | `{"yieldKey":"y4","isAbility":true,"yielded":"yes"}` |
| the same again on an attacks-alone trigger | act with `"y9"`, and seq 383 came back `"yielded":"yes"` |
| a **spell** on the stack (`isAbility:false`) | **no control at all** — the engine's own guard, not a reading of the text |
| `/\by\d+\b/` over `document.body.innerHTML` | **no match**, with the controls on screen and a yield set |

A `yielded` item renders a muted `always yes` chip and its own button switches
to `mode:"clear"`, so the client stores no yield state of its own.

**The lag this section used to report is gone** (§4's shape again). It said the
`yielded` badge "only appears when a *snapshot* follows, and Forge pushes none
for the act itself". Forge still pushes none — but `WireGuiGame.refreshState()`
does. **Re-measured 2026-09-12 in the browser**, on the AI's `Super Suit` equip
ability: `c2s act {"action":"setYield","mode":"yes","yieldKey":"y4"}` at
`t=…183877`, `s2c state` seq 222 at `t=…183878` carrying
`stack[0] = {yieldKey:"y4", isAbility:true, yielded:"yes"}` — **1 ms**, and the
`always yes` chip was on screen with the button already switched to
`mode:"clear"`. `/\by\d+\b/` still matched **nothing** in either
`document.body.innerHTML` or `innerText` with the controls and the chip on
screen.

**The *consequence* is now asserted too, and it was not at first.** Setting the
yield is proven end to end by `yielded:"yes"`; what
`PlayerControllerHuman.skipsPromptForStackOrPhase()` actually uses the store for
is a **later** occurrence of the same key resolving without a priority prompt.
That needs a second occurrence, and the first version of this paragraph said no
seed could be made to guarantee one — so `tools/ws-auto-play.mjs --comfort` only
**measured** it: every later appearance of the yielded key **on top of** the
stack (the only place the engine consults the store) and every `input` with an
enabled OK pushed while it sat there, printed in the run summary
(`autoYield key=… isAbility=… repeats=N promptsWhileOnTop=M`) and labelled
*measured, not asserted*.

**`decks/yield-probe.dck` removed the excuse** (the verification pass): 18 Forest
+ 22 **Thallid**, whose `At the beginning of your upkeep…` trigger is mandatory,
so the same handle returns to the top of the stack every turn. Gate step **10g**
plays it with `--require-yield-repeat`, and the run now FAILS (exit 7) if the key
comes back and the engine asks this seat to act anyway, or if it never comes back
at all. Committed proof: `fixtures/games/human-yield-13.jsonl` —
`autoYield key=y2 isAbility=true repeats=4 promptsWhileOnTop=0`, four later
appearances on top (turns 5, 7, 9, 11) and zero prompts.

The same change made the probe **prefer a stack item with `isAbility: true`**,
which is what `setShouldAutoYield`'s ability scope means the engine can consult
at all — the first committed proof (`fixtures/games/human-comfort-13.jsonl`) set
its yield on a creature *spell*, a key the engine would never look at again and a
control the board would not have offered. **That fixture has been re-recorded**
and now sets its yield on `y3`, a triggered ability
(`docs/evidence/m6-engine.md` §4.4.1).

---

## 4. Undo, and the snapshot that now follows it

`state.undo` is `{can, depth}` (report 11 §7.3). The button is enabled from
`can`, labelled with `depth`, and its title says what is actually undoable —
mana abilities, never a cast.

**Re-measured 2026-09-12** against the current bridge, in one priority window on
turn 1 (the first version of this table is corrected below it):

| step | on screen / on the wire |
|---|---|
| play an Island, tap it | pool `U1`, `li.tile--tapped`; **`Undo (1)`** on our button (`data-undo-depth="1"`, `data-provisional="false"`); the engine's own Cancel **independently** labelled `Undo (1)` |
| press our Undo | `c2s act {"action":"undo"}` at `t=…939569` |
| the engine's answer | three `input` frames, one `notice`, then `s2c state` seq 40 at `t=…939571` — **2 ms** — carrying `undo {can:false, depth:0}`, an empty `manaPool` and card 38 back to `tapped:false`. The engine's own Cancel went back to **`End Turn`** |

**What the first version of this section said, and why it was wrong.** It
reported `state.undo` "**still `{can:true, depth:1}`**, because **no `state`
frame followed the act**", and concluded the board was a frame behind. That was
true of the bridge as it stood at the time and is not true now:
`WireGuiGame.refreshState()` pushes a snapshot for `undo` (and for
`setPhaseStop`, `yieldTo` and `setYield`), so the window is the 0–3 ms the flush
takes when the engine is parked.

**The *provisional* marking stays, and it is not decoration.** It is driven by
"an act went out and `state.board` has not changed since", so with the refresh in
place it clears on the very next frame for `undo` — measured
`data-provisional="false"` throughout this run, and `refresh skips = 0` for the
whole session. Two cases keep it earning its place:

- **`useMana` is unchanged.** Amendment **M30** still holds: no `state` is pushed
  for a mana payment, so the pips are genuinely provisional until something else
  moves. The Undo button shares the flag because an undo *refunds* mana.
- **A skipped refresh** (**D39**) is exactly the old behaviour, on purpose: when
  the act arrives while the engine is running rather than parked, the flush is
  skipped instead of racing the game thread, and the depth on screen is one
  engine flush behind. The marking is what says so, and the engine's own Cancel
  label is the live answer either way (report 11 §7.3).

---

## 5. New Game: a second game in the same JVM, in the browser

The M6 deliverable, driven from the board:

1. Conceded game 1 (two clicks — the button arms first, because there is no undo
   for a concede). The banner read *"Game over. Winner: Forge AI.
   AllOpponentsLost (the match continues)"*.
2. The decision panel grew the New Game row: **New game** (`mode:"continue"`),
   **Restart match** (`mode:"restart"`), and the line *"a new game means a new
   `hello_ok`: every card id the board holds is dropped and rebuilt (§2.1)"*.
3. Pressed **New game**. Six seconds later the board was at
   *"Human, you lost the last game. Would you like to play or draw?"* — a fresh
   game, no JVM restart, no `FModel.initialize` (~2 s) paid again.

What the wire and the reducer did:

| thing | before | after |
|---|---|---|
| `hello_ok.gameId` | `m6-board-1` | `m6-board-1-g2` |
| frame log | `var/games/m6-board-1/frames.jsonl` | `var/games/m6-board-1-g2/frames.jsonl`, its own session header, `seq` from 1 |
| the reducer | board, input, ask, `gameOver`, the log ring, the toasts | **all dropped** (`applyHello`), `gameNumber` 1 → 2 |
| the top bar | `live · seat 0` | `live · seat 0 · **Game 2**` |
| `players[].phaseStops` | `own` had `DRAW` (my toggle) | reseeded from the prefs — per game, as report 11 §8.3 says |

`gameOver` being **sticky** (§3.1) is what makes the reset load-bearing: without
it, game 2 would have opened already over.

**`continue` versus `restart`.** Both render after `over`; `continue` goes quiet
once `over.matchOver` is true, because there is no next game of a finished match
to continue to. `matchOver` is a typed field, never a reading of the result text.

**And both go quiet when the socket does** — the verification fix (**D40**). The
row appears at `over`, which is the one moment in a session when the bridge may
already have gone, and the verification pass caught exactly that: 36 s after the
final `over` the JVM had exited (a flat 30 s fuse in `MtgTable`, since removed)
while **Restart match** was still enabled on screen, so the click produced only
the transport's own toast — *"Not connected — act was not sent, the socket is
closed. Nothing was queued."* `Board` now takes a `connected` prop
(`status.status === 'open'` from `main.tsx`, `null` for a replay) and
`NewGameRow` disables both buttons and prints *"The bridge is not connected"*
with what to do about it.

**Both halves measured in the browser, 2026-09-12** (bridge :8660 `--games 1
--keep-open --seed 42`, vite :5180, both killed by PID afterwards). Conceded,
took `over {matchOver:true}`, and then **left the tab sitting there**:

| | seconds after `over` | `.wsbar` | `New game` | `Restart match` | the row's line |
|---|---|---|---|---|---|
| the fuse that was | ~30 | (socket closed) | enabled | enabled | "a new game means a new `hello_ok`…" |
| now, connected | **94.5** (JVM alive 2 m 15 s, `/health` still `ok`) | `open` | disabled — *"the match is over"* | **enabled, primary** | "a new game means a new `hello_ok`…" |
| now, after `kill <jvm pid>` | +1.5 s | `closed` | **disabled** — *"the bridge is not connected"* | **disabled** — same | *"The bridge is not connected. Neither button can send `act: newGame` — reconnect from the status bar above, or run ./scripts/play.sh again."* |

The server's own line in `var/m6fix-board-server.log` says why it was still
there: *"WAITING for `act: newGame` (--keep-open) -- a client is connected, so
there is no deadline; it ends when the client does"*. **Nothing else on the board reads it**: a click that
cannot be sent is already reported by the transport's own notice, and greying the
table out on a blip would be the client second-guessing the engine. Pinned by
`web/test/board-m6.test.tsx`, *"New Game is disabled, and says why, when the
socket is not open"*, which also asserts that `true` and the default both leave
the row live.

**The sideboard ask**, which only this piece of work could ever reach (M5
follow-up 1), renders through `AskModal`'s existing two-column form. Replayed
from the bridge's new `fixtures/games/human-sideboard-7.jsonl` (game 2 of a
two-game match, 40 main + 15 side): *Main deck (40 cards — this is the answer)*
on the left with ask-local indices, *Pool (main ++ side, ask-local indices across
both)* on the right, Answer / Default / Cancel (null) / Reset underneath. No
board picker, correctly: a decklist is not on the table (**D33**).

---

## 6. SPACE, Escape, and the rest of the keyboard

`input.buttons.focus` is now on the wire (`"ok"` in every frame of the live
game), so **SPACE presses the button the engine focused** and falls back to OK —
which is what Forge's desktop does through Swing focus, and why "space = OK" was
never a Forge shortcut (report 11 §11). The focused button draws a ring and
carries the `SPACE` chip.

**M3 follow-up 13 still stands, and this is its fourth measurement.** With a
listener on `window` — and again with a capture-phase listener on the focused
button — the browser driver delivers Space as `{key:"", code:"", keyCode:0}`, no
key and no code, while `e` arrives as `{key:"e"}`. **So do not read the sentence
"SPACE follows `input.buttons.focus`, proven in a browser" as a claim about the
space bar**: what is proven in a browser is everything *around* it, and the key
itself is **covered by `keys.test.ts` and by the focus ring, and pressed by
nothing but a human.** What was measured here:

- `input.buttons.focus` is `"ok"` on **546 of the 844** `input` frames in
  `fixtures/games/human-comfort-13.jsonl` and `null` on the rest — **never**
  `"cancel"`, which is what §4 of the protocol says this emitter can produce
  (Forge's `focus1` is a boolean naming button one);
- the focused OK button carries `btn--focus`, draws the ring, and is the
  document's `activeElement`;
- `planKey` returns `null` for a focused button, so the browser's own activation
  of a focused `<button>` is not doubled by a `buttonOk` act — the rule
  `keys.test.ts` pins directly.

The letter keys are live, and were driven for real: pressing `E` in the page put
`{"action":"yieldTo","kind":"endOfTurn"}` on the wire.

Escape still closes an overlay first, then answers an open ask with `null`, then
presses the engine's Cancel — verified by opening the `?` overlay and pressing
Escape (the overlay closed; the game did not move).

The `?` overlay lists **eighteen** chords, which is every row in `KEYMAP`:
`SPACE ESC CTRL+Q Z S C L H/? A CTRL+Z P E T B CTRL+A Y N` and `W U B R G C`.
The "milestone has not arrived" styling is **gone**: after M6 every row does
something, except `A`, which points at the button that already exists (Forge
writes `Auto` on `InputPayMana`'s own OK button — there is no `autoPay` act).

---

## 7. Toasts: the level decides, never the title

The corpus says why: **952 of the ~1,000 notices in `fixtures/games/` are
`info` / "Your turn"**, pushed at every priority pass, against 21 `warn` /
"Not selectable". A strip that repeats three words forty times a turn is a strip
nobody reads, including the line it exists for.

So toasts are now `warn` and `error` only — filtered on `level`, which is a typed
field (§6), and **never on the title**, which amendment **M30** forbids. Live:
clicking an opponent's permanent produced exactly one toast, amber, with the
engine's own text — *"Not selectable card 54 cannot be selected now"* — and no
"Your turn" toast anywhere on screen.

"Your turn" became `TurnFlash`: a brief tint over the table, drawn from
`state.priority` (the snapshot) rather than from the notice, `aria-hidden`
because the same fact is already in the phase-strip header, the decision title
and the engine's prompt. Every `info` notice is still in the log drawer,
unfiltered — a toast is never the only copy.

---

## 8. Tests

`npm test` = **425 `node --test`** (0 fail, 0 skipped) **+ 72 vitest** (4 files).

New, `web/test/board-m6.test.tsx` — **15 tests**:

1. a phase dot sends `setPhaseStop` with the phase, the column and the **inverse**
   of its state (driven for real: `PhaseStrip` is hook-free, so the test walks the
   element tree, invokes `onClick`, and asserts the four act bodies);
2. the strip renders from `players[].phaseStops` — `UPKEEP` filled, which is *not*
   a Forge default, so the assertion cannot pass off the old defaults table;
3. a stream with no `phaseStops` draws disabled dots and says they are defaults;
4. a replay's affordances are all disabled;
5. the three pass-to buttons carry the kinds, phases **and columns**;
6. a running yield renders, marks the phase cell, disables the buttons and points
   at Cancel; all three kinds print their own sentence;
7. an ability offers Y/N, shows `yielded`, and **the `yieldKey` appears nowhere in
   the rendered page**;
8. an ability with an empty key, and a replay, get no control;
9. Undo is enabled from `state.undo.can` and labelled with `depth`;
10. New Game / Restart appear only after `over`, with `continue` disabled once
    `matchOver`;
11. the game number reaches the panel (`Game 2`, `Game 2 of 3`);
12. only `warn`/`error` are toasts, "Your turn" is a flash, and the drawer still
    has every notice;
13. every M6 chord is in the `?` overlay;
14. `BoardActions` produces the §2.2 act bodies, spelled out;
15. the `sideboard` ask renders as the two-column form, from the real fixture.

`web/test/reduce.test.ts` gains the per-game reset (a `hello_ok` with the same
`gameId` is a resync and resets **nothing**; a new one drops board, input, ask,
`gameOver`, the log ring and the toasts, keeps the session header and the dropped
event kinds, and counts the game), `gameLabel`, the five readers, and a
"every M6 field is optional" case that folds a pre-M6 `state`.

`web/test/keys.test.ts` gains SPACE→focus (including a focused-but-disabled
Cancel), the three yields with their columns, `CTRL+Z` gated on `state.undo.can`,
`P`, `CTRL+A`, `Y`/`N` against the top item's handle, and the read-only / inside-
an-ask gates for all of them. The old "a key whose milestone has not arrived"
test now has exactly one row left to check.

**A test whose assumption M6 falsified**, and how it was fixed rather than
deleted: `human-seat.test.ts` asserted per file that every `human-*` recording
contains an `ask`. The bridge's new `human-comfort-13.jsonl` legitimately
contains none — a whole game of stops, yields and undo in which Forge dispatched
none of the eleven blocking calls to this seat. The property that assertion was
really guarding ("the ask path never ran, so every §5 assertion here is vacuous")
is a property of the **corpus**, so it moved to one test at the bottom of that
file, which counts asks across every recording and names the files that have
them. Per file, what is asserted now is `input` **and** `act` — the engine
prompted somebody and somebody answered — plus "asks and answers come in pairs".

---

## 9. What the board half does **not** do

- **`input.weak` is still unrendered.** M5 follow-up 10's first half: the field
  is on the wire and the decision panel prints the ids, but the "Auto would tap
  this" dotted outline on the tile is not drawn.
- **No `state.autoPassNoActions`, no `attachedToPlayerId`, no
  `selectable.playerIds`** — the three rows §10 still lists as not emitted.
- **No AI profile picker** (report 11 §9): it belongs in `hello_ok`/config and
  needs a `restartMatch`, and it stays deferred.
- **No yield settings.** `YIELD_*` prefs, suggestions and `DeclineScope` are out
  of scope by report 11 §12, and nothing here reads or writes them.
- **`gameCount` is not on the wire.** `hello_ok` carries no `gameNumber` /
  `gameCount`, so the client counts games itself: the bar says **`Game 2`**, not
  `Game 2 of 3`. Both fields are typed and read if they ever appear
  (`gameLabel`). One consequence, measured: a page **reload** mid-match restarts
  the client's count, so the label disappears until the next game begins — the
  reducer can only count what this stream showed it.
- **Nothing predicts the engine.** No phase-stop logic, no payability, no
  targeting validation, no yield state of its own. Every control here reads a
  typed field and sends an act.

---

## 10. Status

Every row of the task is implemented, tested and driven in a browser against a
real bridge: phase stops (toggled, and the engine stopped where it was told),
Pass-To (all three, with the marker column defect found and fixed), auto-yield
(both keys and both buttons, with the handle never rendered), Undo, New Game (a
second game in the same JVM, with the reducer dropping the first), the keyboard
(eighteen chords, all live, all documented), and the toasts (level-filtered,
with "Your turn" demoted to a flash).

**Amended 2026-09-12 after the verification pass.** §1, §3 and §4 each reported
a lag that the bridge's `refreshState()` had already closed; all three were
re-measured against the current bridge in a fresh browser session and the
numbers above are from that run (`setPhaseStop` → `state` 2 ms in the
play-or-draw prompt, `undo` → `state` 2 ms, `setYield` → `state` 1 ms,
`refresh skips = 0` for the session). §6 no longer implies the space bar itself
was pressed. The *provisional* marking was re-examined and kept, for the two
reasons §4 now states.

`npm run build` — zero TypeScript errors. `npm test` — **425 `node --test` + 72
vitest, 0 failures** standalone (the gate's number is higher: `MTGTABLE_WS_LOGS`
names the fresh ws logs, so `ws-log.test.ts` runs instead of skipping).
Processes started for this evidence (`java … --port 8660`, `vite --port 5180`)
were killed by PID.

---

## 11. Status — the documentation pass, 2026-09-12

**One bullet in §9 is superseded and is corrected here rather than edited
away.** *"`gameCount` is not on the wire"* was true when it was written and is
not true now: the verification pass added amendment **M41**, so `hello_ok`
carries `gameNumber` and `gameCount` (emitted from `WireGuiGame.gamesStarted()`
and `--games`, and **omitted entirely for a one-game match**). The bar therefore
says **`Game 2 of 3`** from the bridge, `gameLabel()`'s own count of distinct
`gameId`s is the fallback for recordings that predate M41, and the measured
consequence in that bullet — a page reload mid-match losing the label — applies
only to those older streams. Everything else in §9 stands: `input.weak` is still
undrawn, the three unemitted rows are still unemitted, and there is still no AI
profile picker and no yield settings, all deliberately.

**Where the board half is written down now.** `README.md`'s *"Playing in the
browser"* gained a **comfort block** — phase stops, Pass-To (`E` / `T` / `B` and
the panel row), auto-yield (the per-stack-item buttons, `Y` / `N` for the top
item, and the handle that is never displayed), Undo, New Game, and the
floating-mana prompt that is now on by default — above the full key table, which
already listed every chord. `PLAN.md` §M6 carries the evidence bullets, thirteen
**M6 follow-ups** (items 3, 12 and 13 are this file's: `input.weak`, the
provisional mana pool, and the space bar nobody has pressed) and the **M7**
hand-over. `DECISIONS.md` gained **D41**, **D42** and **D45** — the phase-stop
shape the strip reads, the opaque `yieldKey` the stack panel passes back, and why
`Space` sends nothing when the browser will already press the focused button.

**The gate, re-run for this pass** (`WSPORT=8666 ./tools/check-all.sh`):
**exit 0, 711 s**, log `var/check-all-m6-docs.log`. Its web step is this half's
number: **455 `node --test` (447 pass, 0 fail, 8 skipped) + 74 vitest**, with
`<Board/>` rendering every frame of all eighteen committed recordings — including
`human-comfort-13`, `human-yield-13` and `human-sideboard-7` — plus a clean
`npm run build`. No browser session was opened for this pass and no process was
left running.
