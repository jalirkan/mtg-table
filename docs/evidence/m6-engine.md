# M6 — the engine side: what was run, and what each act did

Date: 2026-09-12. Scope: the bridge half of M6 — a session that survives `over`,
phase stops, pass-to, auto-yield, undo, `buttons.focus`, the mana-lost prompt,
and the gate steps that keep all of it true. The spec is
[`docs/research/11-engine-comfort-features.md`](../research/11-engine-comfort-features.md);
the wire is [`docs/protocol.md`](../protocol.md) amendments **M32–M40**, which
this milestone promoted out of that file's §10 "planned additions" and into the
live sections.

Every number below was measured on this machine, against
`forge-gui-desktop-2.0.14-jar-with-dependencies.jar`
(`sha256 3c0a7c38…5dd9`), Java 21 JRE, Node 24.

---

## 0. The one-paragraph version

`HostedMatch.continueMatch()` / `restartMatch()` now reach the wire as
`act: newGame {mode}`, and that single row unblocked three others: the
`sideboard` ask has a recording for the first time
(`fixtures/games/human-sideboard-7.jsonl`), `var/games/` holds one
`frames.jsonl` **per game**, and a new `hello_ok` with a new `gameId` tells the
client to drop its card map. Four typed acts joined it — `setPhaseStop`,
`yieldTo`, `setYield`, `undo` — and each one is proven in a committed recording
by the **state it changed**, not by a count. The comfort state a client needs to
draw any of it (`players[].phaseStops`, `state.yield`, `state.undo`,
`stack[].yieldKey|isAbility|isOptionalTrigger|yielded`, `input.buttons.focus`)
is on the wire, server-owned, and the client computes none of it. With
`sideboard` recorded, **nine** of the eleven ask kinds now have an engine
recording; `manipulate_list` and `options` remain the two documented ceilings
(protocol §5.2).

---

## 1. The gate

`./tools/check-all.sh` from a deleted `bridge/out`, `WSPORT=8665`: **green**.
Thirteen numbered steps, with 9b, 9c, **9d (new)** and 10a–10f, **10g (new)** as
lettered sub-steps — two more than M5 left behind, and both of them are things
no other step can reach.

| step | what it now covers | result |
|---|---|---|
| 2 | `tools/lint-bridge.sh`, with a new rule 4b: `StackItemView.getKey()` is a **budget of one**, in `WireGuiGame.rawYieldKey()`, tagged `// ALLOW getKey:` | 20 files, clean; negative-controlled twice (a second call in `Snap.java`, and a call on a *renamed* receiver, both fail the build — reproduced) |
| 9d | **the `sideboard` ask**: `--transport auto --probe --games 2 --seed 7 --deck decks/sideboard-probe.dck` | ask fired in game 2, answered with 40 indices of which 1 from the sideboard, two frame logs with distinct ids |
| 10g | **three games over one socket**: `--games 3 --comfort` | 3 `over`s, 3 `hello_ok`s, 3 frame logs, both `continueMatch` and `restartMatch`, 5 acts with their effects |
| 11 | `check-redaction.mjs` over 19 committed fixtures (18 `games/` + 1 `synthetic/`) and every fresh recording | all pass |
| 13 | `npm run build && npm test` | 455 `node --test` (447 pass, 0 fail, 8 skipped) + 74 vitest, over a corpus that now includes all three new fixtures. Standalone (no `MTGTABLE_WS_LOGS`) it is 445 + 74 with nothing skipped |

**9b, the advisory, fired — with its known noise and nothing else.** The one
differing `s2c` frame is `input {prompt:"Waiting for Forge AI..."}` at ×16
against ×14, i.e. two ticks of `awaitNextInput()`'s 250 ms re-push
(PLAN.md M5 follow-up 6), plus one extra `act buttonCancel` from the seat. An
immediately preceding run of the same step on the same fixture printed
`MULTISET IDENTICAL: 1587`. What it is *not* is the M6 field drift: that showed
up as **1185 paired differences in every frame**, and re-recording the fixture
(§7) is what cleared it.

**The `buttonCancel` half swings both ways, and the step now says so itself.**
The committed re-record has **45** `buttonCancel` against the M3-era fixture's
46; a fresh seed-42 run on this machine has been seen with 46 against the
committed 45. Either direction is the same one-frame band. Follow-up 6 asked for
a choice between teaching the diff about it and leaving it loud:
`tools/fixture-multiset-diff.mjs` now prints a NOTE naming both noisy shapes
whenever it differs, so the honesty is at the point of failure rather than in a
plan nobody has open.

Wall clock for the full run is in §8.

---

## 2. New Game: a session that outlives `over`

### 2.1 What the bridge does

`openView` is the reset hook, because it is the hook Forge gives us:
`HostedMatch.startGame()` calls it *before* handing the match to a game thread,
and `endCurrentGame()` has by then nulled the `Game`, cleared
`getHumanControllers()` and replaced every `PlayerView`
(report 11 §8.3). `WireGuiGame.resetForGame(n)` rebuilds, in this order: the
frame log (a **new file**, new `gameId`), the card/player/ability indexes, the
concealed-id set, the yield-handle table, the phase-stop map (reseeded from the
preferences), the `input` struct, the over latch, and `ReplyPool.reopen()`.
`overEmitted` is cleared **last**, because `emit` drops every non-`over` frame
while it is set and the handshake is the first frame of the new game.

Two things are deliberately **not** reset: `askSeq`, so an `askId` is unique for
the life of the socket and a late answer from the previous game cannot complete
this game's ask by collision; and `FModel`, which is the entire point of the
feature (`FModel.initialize` is ~1,960 ms).

Nothing in the bridge starts a game. The client does, with `act: newGame`, and
`MtgTable`'s loop only watches: after each `over` it waits up to 30 s for the
next `openView` and exits if none comes. `--transport null` therefore still
plays exactly one game and exits, exactly as before.

**Which means the session has to outlive the last game for New Game to have
anything to act in.** Two flags do that and they are the only two:
`--games N` plays N and exits, and `--keep-open` lingers after the last one —
and that linger is now *inside* the loop, so a client that presses New Game
during it starts a game rather than watching the process exit under it. **The
linger is unbounded while a client is connected** (the verification fix, D40): it
was a flat 30 s wall clock that ran whether or not anybody was attached, which
closed the socket out from under the board's own New Game row. Measured
(`--transport ws --keep-open` with the default `--games 1`, a client that asks
for a second game):

```
NEW GAME REQUESTED mode=restart (NEW) after kotest2
NEW GAME 2 kotest2-g2: caches, phase stops, reply pool and frame log rebuilt from openView
game 2 began during --keep-open: kotest2-g2
games          = 2 played of 1 asked for, last game id kotest2-g2, matchOver = true
```

`MtgTable.awaitNextGame()` returns the instant a client that *was* connected
disconnects, so a scripted client pays nothing for it: the same server with a
one-game client exited 3 s after the client left (32.2 s total for a 29.0 s
game). `scripts/play.sh` passes `--keep-open` and `--games 3` by default as of
M6.

**The verification fix, measured** (D40): `--transport ws --games 2 --keep-open`,
one client connected the whole time and **silent for 40,046 ms** after game 1's
`over` (`tools/ws-auto-play.mjs --new-game-delay-ms 40000`, added for this):

```
WAITING for `act: newGame` (between games 1 and 2) -- a client is connected, so there is no deadline; it ends when the client does
game 2 began: fuse-fixed-g2
WAITING for `act: newGame` (--keep-open) -- a client is connected, so there is no deadline; it ends when the client does
the client disconnected (--keep-open) -- the session ends here
games          = 2 played of 2 asked for, last game id fuse-fixed-g2, matchOver = true
```

Game 2 began **39 ms** after the act. Before the fix the socket was closed at
~30 s and the act was never delivered.

### 2.2 Measured, three games on one socket (gate step 10g, seed 13)

```
NEW GAME REQUESTED mode=continue (CONTINUE) after check-all-ws-3g
NEW GAME 2 check-all-ws-3g-g2: caches, phase stops, reply pool and frame log rebuilt from openView
NEW GAME REQUESTED mode=restart (NEW) after check-all-ws-3g-g2
NEW GAME 3 check-all-ws-3g-g3: caches, phase stops, reply pool and frame log rebuilt from openView
games          = 3 played of 3 asked for, last game id check-all-ws-3g-g3, matchOver = false
M6 acts        = newGame 2, setYield 1, yieldTo 1, setPhaseStop 1, undo 1
MTGTABLE OK
```

| game | log | lines | `over` | `hello_ok` | last frame |
|---|---|---|---|---|---|
| 1 | `var/games/check-all-ws-3g/frames.jsonl` | 1321 | 1 | 1 | `over` (`matchOver: false`) |
| 2 | `…-g2/frames.jsonl` | 1571 | 1 | 1 | `over` (`matchOver: true`) |
| 3 | `…-g3/frames.jsonl` | 847 | 1 | 1 | `over` |

**Both engine paths ran, from one flag.** `--games 3` is a best-of-three, the
match was decided 2–0, and the client reads the mode off the frame it was given:
`matchOver: false` → `continue` (`HostedMatch.continueMatch()`), `matchOver:
true` → `restart` (`restartMatch()`, a fresh `Match` from the same rules and
players). 85.7 s of wall clock for three games, one JVM.

The client rolls its own log the same way: `var/ws-auto-3g.jsonl`,
`-g2.jsonl`, `-g3.jsonl`. All six files pass `check-redaction.mjs`.

### 2.3 The one act that is not in the frame log

`newGame` is dispatched, applied and printed on stderr, and it appears in
**neither** game's `frames.jsonl`. That is deliberate and is stated in
`docs/protocol.md` §2.2: `over` is the terminal frame of a file (§8.4) and the
gate asserts `tail -1` is `over`, so an act written after it would take that
place. The client's own log records what the client sent, held until the next
game's header the way amendment M9 holds any early frame.

---

## 3. The `sideboard` ask — the ninth kind with an engine recording

M5 follow-up 1 and amendment **M27** said the wire was right and the session
ended too early. It did. `Match.prepareAllZones` calls
`PlayerController.sideboard` **between** games, on the game thread (bytecode:
`Match.startGame(Game,Runnable)` → `prepareAllZones` → offset 457), which is
where `WireGuiGame.ask`'s `assertGameThread` wants it.

`fixtures/games/human-sideboard-7.jsonl` is game 2 of
`--transport auto --probe --games 2 --seed 7 --deck decks/sideboard-probe.dck`:

```jsonc
// the ask (abridged): 40 main + 15 side, options are PaperCards, kind "other"
{"type":"ask","body":{"askId":"a1","kind":"sideboard","timeoutMs":30000,
  "prompt":"Human",
  "main":[{"id":0,"label":"Forest (TRK)","kind":"other"}, … ,
          {"id":39,"label":"Garruk's Companion (M12)","kind":"other"}],
  "side":[{"id":40,"label":"Giant Growth (MSH)","kind":"other"}, …]}}
// the answer: the NEW main deck, as indices into `main ++ side` (§5.1)
{"type":"answer","body":{"askId":"a1","value":[0,1,…,37,38,40]}}
```

The answer is 40 indices, none repeated, the last of which is `40` — **the first
sideboard card, swapped in for `main[39]`**. That is `--probe`'s policy
(`AutoTransport.answerFor`, mirrored in `tools/ws-auto-play.mjs`); the default
policy answers with the identity, which is legal, is what a player clicking
straight through sends, and never executes the index marshalling at all. Gate
step 9d asserts the stronger one: a legal, main-sized, non-identity answer.

`order` with `sideboardMode: true` (M5 follow-up 12) is the neighbour that was
blocked on the same work. It is still unrecorded: Forge raises it only when the
deck needs reordering after sideboarding, which this probe deck does not.

**The corpus count, since it is easy to get wrong.** A census of
`fixtures/games/*.jsonl` gives `choose_list` 56, `ability_menu` 20,
`assign_amount` 10, `choose_entities` 7, `text` 6, `order` 4, `assign_damage` 3,
`confirm` 2, `sideboard` 1 — **nine** of the eleven kinds have an engine
recording, and the other two (`manipulate_list`, `options`) are the documented
ceilings of protocol §5.2, not a gap. An earlier draft of this file and of
§5.2 said "ten"; nine plus two is the eleven.

---

## 4. The five acts, each with the state it changed

All excerpts are from **`fixtures/games/human-comfort-13.jsonl`** — the bridge's
own frame log of `tools/ws-auto-play.mjs --comfort` at seed 13, committed as a
fixture so the evidence is replayable. Line numbers are 1-based lines of that
file; "before"/"after" are the `state` frames either side of the act.

### 4.1 `setPhaseStop {phase, turn, stop}`

```jsonc
line  10  c2s act  {"action":"setPhaseStop","phase":"UPKEEP","stop":true,"turn":"own"}
line   3  before   players[0].phaseStops.own = ["MAIN1","COMBAT_DECLARE_BLOCKERS","MAIN2"]
line  11  after    players[0].phaseStops.own = ["UPKEEP","MAIN1","COMBAT_DECLARE_BLOCKERS","MAIN2"]
```

The "before" set is Forge's own default for a human seat
(`FPref.PHASES_HUMAN`: MAIN1, DECLARE_BLOCKERS, MAIN2 — report 11 §3.2), and the
AI's is the other one (`COMBAT_BEGIN`, `COMBAT_DECLARE_ATTACKERS`,
`COMBAT_DECLARE_BLOCKERS`, `END_OF_TURN`), which is why `phaseStops` is
`{own, opp}` and not one list: they are different preference arrays and the
strip draws one row per seat. `UPKEEP` is `false` in that array, so seeing it in
`own` afterwards can only be the act's doing.

The map is `WireGuiGame`'s own, keyed by **player id** (a new game replaces every
`PlayerView`), seeded per game, and **never saved**. `isUiSetToSkipPhase`
answers from it with no allocation and no logging — it is asked on every step of
the priority loop. The act also sends `YieldUpdate.SkipPhase` to the controller,
which is not decoration: it is how Forge's own `tryAutoPassNow()` fires when a
stop is turned *off* while the game is already parked on an
`InputPassPriority`.

### 4.2 `yieldTo {kind:"endOfTurn"}` and its cancel

```jsonc
line  42  before   state.yield = null
line  47  c2s act  {"action":"yieldTo","kind":"endOfTurn"}
line  52  after    state.yield = {"kind":"endOfTurn","playerId":0,"phase":null}
line  56  c2s act  {"action":"buttonCancel"}
line  62  after    state.yield = null
```

Note `playerId: 0` on an `endOfTurn` yield: **`playerId` is the yielding seat for
all three kinds** and is never null. Only `phase` is null for the two kinds that
have no phase (protocol §3.1; amendment M34's own wording said `playerId` too and
was corrected by this verification pass).

**Cancelling a yield needed no act of its own and must not get one.** While a
yield runs, `AbstractGuiGame.updateAutoPassPrompt()` drives the prompt itself and
`InputLockUI` puts a labelled, enabled Cancel on screen whose
`selectButtonCancel()` is `clearActiveYieldAndDispatch()`. `buttonCancel` has
been on the wire since M3.

The other two kinds go through the same act: `stack` →
`YieldUpdate.StackYield(me, true, true)`, `marker` →
`AbstractGuiGame.handleYieldMarkerToggle(owner, phase, runnable)` — called, not
reimplemented, because it takes the at-or-past-marker reading *before* it
un-skips the cell, and our runnable is its "make this phase a stop" step (a
marker on a phase we skip could never fire). `marker` has no engine recording
here; `fixtures/synthetic/sample-handwritten.jsonl` carries its shape.

### 4.3 `undo`

```jsonc
line 382  before   state.undo = {"can":true,"depth":2}
line 383  c2s act  {"action":"undo"}
line 384  after    state.undo = {"can":false,"depth":0}
```

The prompts either side say what was and was not undone. `input.prompt` at line
379 is `"Ant-Man's Air Force - Creature 2 / 1\n\nPay Mana Cost: {1}{U}"` with
`buttons.ok.label: "Auto"`; at line 385, *after* the undo, it is **still that
prompt**. Two mana abilities (the engine's own `Auto` tapping two lands) were
rolled back together — `depth` 2 → 0 — and the **cast was not**: the engine stayed
parked on the payment, the automated seat paid again, and line 386 is
`"Stack: 1 to Resolve."`. That is exactly the scope report 11 §7.1 documents:
**undo holds mana abilities, not spells**, and Forge clears the undo stack at
every phase change and whenever priority leaves you.

`can` is `PlayerControllerHuman.canUndoLastAction()` (priority is mine and the
undo stack is mine) and `depth` is `MagicStack.getUndoStackSize()`, both read on
the game thread with the rest of the snapshot.

**One failure observed, and it is Forge's.** In an earlier run of the same probe
the act threw `ArrayIndexOutOfBoundsException: Array index out of range: 1` out
of `undoLastAction()` while the engine was mid-payment; `applyAct` caught it,
emitted `notice {level:"warn", title:"Action failed"}`, the undo stack was
cleared (depth 2 → 0, Forge's own failure path) and the game played on to a
normal `over`. It did not reproduce in the committed recording or in the gate.
The bridge's contract is "degrade, never wedge", which held; the act now prints
a stack trace on stderr as well as the notice.

### 4.4 `setYield {yieldKey, mode}`

```jsonc
line 522  before   stack = [{"id":9,"yieldKey":"y3","isAbility":true,"yielded":null, …}]
line 527  c2s act  {"action":"setYield","mode":"yes","yieldKey":"y3"}
line 528  after    stack = [{"id":9,"yieldKey":"y3","isAbility":true,"yielded":"yes", …}]
```

The item is a **triggered ability** (`"When this creature enters, it
connives…"`), and that matters: see §4.4.1.

`y3` is a **bridge-minted handle**. Forge's own key for that item is
`StackItemView.getKey()` = `CardView.toString() + ": " + the ability's text` —
a card name, its id and its rules text. The handle table
(`WireGuiGame.keyToHandle` / `handleToKey`) is the only place the raw key exists
in this process, `rawYieldKey()` is the only call to `getKey()`, and two
mechanical guards keep it that way:

- `tools/lint-bridge.sh` rule 4b — a budget of **one** tagged call, in
  `WireGuiGame.java`. The rule derives the receivers it watches from **every
  identifier declared `StackItemView`** under `bridge/src`, not from the
  spelling `si.` it matched at first, so renaming the variable does not turn it
  off. Two negative controls, both reproduced: a second call added to
  `Snap.java` fails with `LINT FAIL: StackItemView.getKey() outside
  WireGuiGame.java`, and a second call on a *renamed* receiver
  (`final StackItemView item = si; item.getKey()`) fails with
  `LINT FAIL: StackItemView.getKey() appears 2 time(s) … (receivers watched:
  item,si)`.
- `tools/check-redaction.mjs` — **no `yieldKey` may contain a space or a `(`**.
  Two characters are the whole assertion and they are enough: a raw key always
  carries the parenthesised id (`"Battlefield Agent Phil Coulson (70): …"`), a
  handle never does.

`mode` is `"yes"` / `"no"` / `"clear"` and drives both engine stores at once:
`setTriggerDecision(key, ACCEPT|DECLINE|ASK, scope)` then
`setShouldAutoYield(key, on, scope)`. `scope` is
`getYieldController().isAbilityScope()` read from the controller and never
hardcoded — with Forge's default `UI_AUTO_DECISION_MODE` it is `true`, and
passing `false` would store a key Forge then strips and never matches.

**`setYield` is also why the bridge pushes a snapshot after an act.** Protocol
§2.2 says an act's effect "arrives as the next `state`", and for every M2 act
that is automatic — a click makes the engine do something and something makes
events. `setYield` makes no game event at all: it changes `stack[].yielded` and
the engine is parked waiting for this seat, so without a push the board would
never show the toggle it just asked for. `refreshState()` hops to a game thread
(a snapshot may only be built on one) and flushes. It runs after `setYield`,
`setPhaseStop`, `yieldTo` and `undo`, and nothing else. **The hop needs an
exclusion argument and now has one — §4.8 and D39.**

#### 4.4.1 The store is written — and, separately, READ

**The first version of this recording set its yield on a creature *spell*
(`isAbility: false`), and that was the wrong demonstration.** The act was
accepted and the store answered `yielded:"yes"`, which is all §4.4 asserts; but
`setShouldAutoYield` is called with the controller's ability scope, which strips
the key to its ability portion, so **a key minted from a spell is one the engine
would never consult again** — and the board would not have offered the control
there either (it offers it for an ability, and for an optional trigger this seat
controls). It was an accident of the probe taking whatever happened to be on top
of the stack.

Both halves of that are fixed, and this file is the fixed version.
`tools/ws-auto-play.mjs --comfort` **prefers an item with `isAbility: true`**,
falling back to any keyed item only after 40 chances so a deck that never raises
one still proves the act; the recording above is a re-record and its item is a
triggered ability.

**And the behaviour is now asserted, not measured.** `yielded:"yes"` proves the
store was *written*. What the store is *for* is
`PlayerControllerHuman.chooseSpellAbilityToPlay`, which at offsets 399-478 does
`peekAbility() != null && isAbility() && shouldAutoYield(yieldKey())` →
`awaitNextInput(); return null` — **no `InputPassPriority` at all**, i.e. a later
occurrence of the same key resolves without asking this seat. Proving that needs
the same ability back on the stack, which no deck in the repo could be relied on
to produce, so the number was printed and labelled *measured, not asserted*.

`decks/yield-probe.dck` removes the excuse: **22 Thallids**, each with a
mandatory `At the beginning of your upkeep…` trigger, so the same handle returns
to the top of the stack every turn. The gate's step **10g** plays it and passes
`--require-yield-repeat`. Measured on `fixtures/games/human-yield-13.jsonl`
(the committed recording of that probe, one game, seed 13):

```
autoYield key=y2 isAbility=true repeats=4 promptsWhileOnTop=0
```

Four later appearances on top of the stack — turns 5, 7, 9 and 11 — and **zero**
`input` frames carrying `buttons.ok.enabled` while it was there. The one prompt
that *does* follow the act is the occurrence the yield was set on (the engine was
already parked in an `InputPassPriority` for it, and writing the store does not
retract an input already on screen); the probe excludes it by construction and
says so. A prompt on any later occurrence now fails the run with exit 7.

Two measurement bugs were found and fixed while turning the number into an
assertion, and both are worth knowing about because either one would have made a
green run meaningless:

- **A handle is interned for the life of ONE game.** `openView` rebuilds the
  whole table and `endCurrentGame()` empties the human controllers with the
  store in them (amendment M38), so `"y2"` in game 2 of a `--games 3` run is a
  *different* item that was never yielded on. Counting across the boundary
  reported `repeats=6 promptsWhileOnTop=8` on a run whose actual game-1 numbers
  were `4` and `0`.
- **Only the TOP of the stack is consulted.** `skipsPromptForStackOrPhase()`
  reads `peekAbility()`, so a count taken over the whole stack measures something
  the engine never looks at.

### 4.5 `passPriority`

```jsonc
line  67  c2s act  {"action":"passPriority"}
```

`IGameController.passPriority()` disassembles to *press OK only if the engine is
currently asking for a priority pass* — which is what makes it the safe keyboard
binding, unlike `buttonOk`, which would confirm a targeting prompt. It is in the
gate as a **count only**: its effect is indistinguishable from an ordinary pass,
and inventing an assertion for "the phase advanced" would assert the engine
rather than the act.

**And the gate now says so out loud**, which it did not at first.
`ws-auto-play.mjs`'s `comfortReport()` returned `passPriority`'s own "sent" flag
in its effect column, so the run summary read `passPriority=ok` and step 10g's
echo said all six acts "moved the board". The report row now carries a
`countOnly` flag: the summary prints `passPriority=sent(count)`, and 10g echoes
*"setPhaseStop, undo, setYield, yieldTo and buttonCancel(yield) each moved the
board; passPriority sent (a count, no-op by design)"*. Five effects and one
count, named as what they are.

---

### 4.6 The console seat got the same two things

`--transport console` is a real seat and it dead-ended at `over` like every other
one. It now has `next` (the next game of this match) and `new` (a new match) in
its one-line vocabulary and in `?`, and **Enter follows `buttons.focus`** before
falling back to "OK when OK is enabled, Cancel otherwise" — which is the same
rule §5 gives the browser, for the same reason.

### 4.7 A rejection that cannot be sent is a correction instead

`emit` refuses every non-`over` frame once `over` has gone out (§8.4), so
**between games there is no channel to say "no" on**: a `notice` written there
would be dropped and the client would see nothing at all. Rather than dead-end a
New Game button on a mode the client could only have got right by reading
`over.matchOver` first, the bridge corrects and says so on stderr — an unknown
`mode` reads as `continue`, and `continue` after `matchOver: true` reads as
`restart`, which is the only mode that can produce another game. The refusal
that *can* be sent is still a refusal: `newGame` while a game is running is
dropped with a `notice`, because there the channel is open.

---

### 4.8 The push these four acts need, and the guard it needed (D39)

`setYield` changes `stack[].yielded` and nothing else; it produces **no game
event**, and the engine is parked waiting for this seat, so with no push the
board would never show the toggle it just asked for. The same is true of
`setPhaseStop` on a turn the map is not consulted on, of `yieldTo`, and of
`undo`. `WireGuiGame.refreshState()` is that push.

**It was unguarded, and that was a hard-rule-3 hazard the verification pass
caught.** `ThreadUtil.invokeInGameThread` is
`Executors.newCachedThreadPool(new WorkerThreadFactory("Game"))` (javap), so the
runnable lands on a **second** `Game-n` worker while `Game-0` runs the match;
both pass `ThreadUtil.isGameThread()`, which is a bare
`getName().startsWith("Game")`, so `Snap.assertGameThread` waves it through.
SIGQUIT dumps of a live browser bridge showed `Game-0` parked in
`InputPassPriority.showAndWait` with idle pool workers `Game-4` and `Game-5`
alongside it. All four acts are sendable from the browser while the engine is
running — the phase-strip dots, Undo, Pass-To and the yield toggles are enabled
whenever there is no open ask and no game over. Nothing broke in ~25 games, which
is exactly what hard rule 3 means by *silently*.

**The guard is D39.** `refreshSnapshot(gen)` returns without touching a view
unless the input generation is unmoved (**D22**'s stamp) **and**
`enginePausedForSeat()` is true — `ReplyPool.pending() > 0`, or
`PlayerControllerHuman.getInputQueue().getInput() != null`, which is a
`BlockingDeque.isEmpty()` then `peek()` and means a thread is sitting in
`InputSyncronizedBase.awaitLatchRelease()`. A skipped refresh is counted and
printed (`refresh skips = N`), never forced.

**Measured on the current build:**

| run | refresh skips | act → next `state` |
|---|---|---|
| `--games 3 --seed 13 --comfort` over a socket (10g's shape) | **2** of 4 | `setPhaseStop` 2 ms · `undo` 3 ms · `setYield` 0 ms · `yieldTo` **217 ms** (a skip; the effect arrived with the engine's own next flush) |
| a browser session (bridge :8660, board :5180, `--games 2 --seed 42`) | **0** of 3 | `setPhaseStop` 2 ms (in the play-or-draw prompt) · `undo` 2 ms · `setYield` 1 ms |

The split is the whole point: a **human** presses these controls while the engine
is parked waiting for them, so the guard costs nothing; a **scripted** client
fires the act the instant a frame arrives, which is exactly when the engine may
still be running — and that is the case the guard exists for.

---

## 5. `input.buttons.focus`, and the half of M6 that was already on the wire

`updateButtons(owner, label1, label2, enable1, enable2, **focus1**)` — the sixth
argument was being dropped. It is `"ok"` or `null` on the wire (`focus1` is a
`boolean` naming button one; `"cancel"` is in the declared type and this emitter
cannot produce it). Measured over `human-comfort-13.jsonl`'s sibling run:
**507 of 717 `input` frames carry `focus: "ok"`**.

It matters because "Space presses OK" is not a Forge behaviour — Space presses
the *focused* button, and that is why `docs/research/11-engine-comfort-features.md`
§11 says Space and Escape are not Forge shortcuts at all.

The same fixture shows the four features that needed no new wire, as engine
labels the client renders verbatim:

| line | `buttons.ok` | `buttons.cancel` | what it is |
|---|---|---|---|
| 377 | `{"label":"Auto","enabled":true}` | `{"label":"Cancel","enabled":true}` | **Auto Pay** — `InputPayMana`'s own OK |
| 17 | `{"label":"OK","enabled":true}` | `{"label":"End Turn","enabled":true}` | **End Turn** — `InputPassPriority`'s own Cancel |
| (other runs) | `{"label":"OK","enabled":false}` | `{"label":"Undo (1)","enabled":true}` | **Undo** — the same button, when an undo is available |

The third row is marked *(other runs)* honestly: this particular recording never
produced an `Undo (n)` Cancel label, because the automated seat pays with the
engine's own `Auto` and the label only appears while an undoable mana ability is
on the stack **and** an `InputPassPriority` is up. It is measured live in
`docs/evidence/m6-board.md` §3 (`Undo (1)` in the browser, beside the panel's own
`state.undo` button).

There is no `autoPay` act and no `endTurn` act, and inventing one would be the
"the board threw the engine's answer away" failure.

---

## 6. `UI_MANA_LOST_PROMPT` on by default

M5 follow-up 2 left the decision to M6; it is taken. `config.json` grows
`"manaLostPrompt": true`, `MtgTable` sets `FPref.UI_MANA_LOST_PROMPT` **in
memory** from it (never `save()`, same rule as D13), and `--mana-lost-prompt` /
`--no-mana-lost-prompt` override it either way. Every session header now carries
`prefs: ["UI_MANA_LOST_PROMPT"]` (amendment M31), so a recording still says what
shaped it.

**The consequence, stated plainly:** `confirm` — the ask kind M5 could only
reach with a probe flag — now occurs in ordinary games, when you would pass
priority with floating mana that is about to be lost. The board already renders
a `confirm` and the automated seat answers one terminatingly, so nothing else
had to move.

**It changed no game we can measure — and the first version of this paragraph
overstated that, so here are the real numbers.** Re-recording `human-auto-42` at
seed 42 with the pref on produced **1,587 lines against the M3-era fixture's
1,588**: the seat sent **one fewer `buttonCancel`** (45 against 46, so 214 `act`
frames against 215). Everything else is identical — 951 `input`, 233 `state`,
154 `notice`, 16 `ask`, 16 `answer`, 1 `hello_ok`, 1 `over`, and the same
terminal `over {winner:1, reason:"AllOpponentsLost", matchOver:true}`. **The
game is the same game**; what moved is one frame of the seat's own
press-the-enabled-button policy, which is the same jitter 9b is advisory for
(see §1 and PLAN.md M5 follow-up 6 — a fresh seed-42 run here has been seen with
46 `buttonCancel` against the committed 45, i.e. the committed fixture is on the
low side of that one-frame band, not off it). The only differences in the frame
*bodies* were the new fields. That is what made the fixture safe to re-record.

---

## 7. Fixtures: what was re-recorded, and why

**Re-recorded because a wire change forced it — one file:**

- `fixtures/games/human-auto-42.jsonl`. It is the file gate step **9b** diffs a
  fresh seed-42 recording against, i.e. the file whose whole job is to pin the
  emitter's current output. With the M6 fields added, 9b reported
  `MULTISET DIFFERS: 1185 frame instance(s)` on both sides — a paired difference
  in every frame, all of it the new keys (`focus`, `phaseStops`, `yield`, `undo`,
  the four `stack[]` fields). Re-recorded; 9b is back to
  `MULTISET IDENTICAL: 1587`.

**New:**

- `fixtures/games/human-sideboard-7.jsonl` — the `sideboard` ask (§3).
- `fixtures/games/human-comfort-13.jsonl` — the five acts (§4).

**Regenerated:**

- `fixtures/synthetic/sample-handwritten.jsonl` — `phaseStops` on all four
  player objects, `yield: null` + `undo` in the first state, a **marker** yield
  and `undo {can:true, depth:2}` in the second, the four `stack[]` fields on both
  stack items (a spell with `yielded: null`, and an optional trigger with
  `yielded: "yes"` on an item whose `text` is concealed), and `buttons.focus` on
  both inputs. It is the renderer's evidence for the two shapes no engine
  recording here carries: a marker yield, and a yielded item you cannot name.

**Not re-recorded — fourteen files.** Every other committed fixture passes
`check-redaction.mjs` unchanged and now prints
`M6 comfort fields absent: … (legitimate — no seat, or recorded before M6)`.
That absence is protocol, not drift: an AI-vs-AI `RecordMatch` log has no seat to
answer phase stops or an undo stack for, so `Snap.state`'s four-argument form
**omits** the fields rather than inventing empty ones, and `check-redaction`'s new
`optional()` helper counts the absence instead of failing it. (Contrast
`sinceAmendment`, which fails unless `--pre-amendment` is passed: those keys have
no legitimate absence and these do.)

---

## 8. Timings

| | |
|---|---|
| `FModel.initialize` | 1,959 ms (unchanged; not paid again per game) |
| one `--transport auto` game, pacho-shield | 17–30 s |
| the two-game sideboard probe (9d) | 45 s |
| three games over one socket (10g) | 85.7 s, one JVM |
| `tools/ten-games.sh` (9c) | 265–266 s |
| the whole gate, from a deleted `bridge/out` | **11 m 22 s – 11 m 46 s** (682 s / 706 s on two clean runs; was ~9 m before M6, so 9d adds ~50 s and 10g ~100 s). The first draft of this row said 10 m 40 s, which no clean run has reproduced |

---


## 8b. Corrections made after the verification pass (2026-09-12)

Everything in this section is a defect in this file, in a tool or in the bridge
that the M6 verification pass found, and what was done about it.

| what was wrong | fix |
|---|---|
| **`refreshState()` walked the view graph on a second `Game-n` worker with no exclusion argument** — a hard-rule-3 hazard that a green gate cannot see | §4.8: D22's generation stamp **plus** a positive "the engine is parked" predicate, skips counted and printed, and **DECISIONS.md D39** written |
| **`./scripts/play.sh` did not deliver M6's own headline command.** A bare run passed neither `--keep-open` nor `--games N`, so the socket closed the instant game 1's `over` landed and the New Game row the board had just drawn had no session to act in | the script now defaults to `--games 3` **and** `--keep-open`; `--no-keep-open` and a caller's own `--games` override. PLAN.md §M6, README and CLAUDE.md say so |
| **protocol §5.2 and this file said "Ten of the eleven kinds now have an engine recording"** — the corpus has **nine**, and the same table two rows above correctly listed the two unreachable kinds | corrected in both, with the census printed (§3) |
| **§6 said the mana-lost default "changed no game — the same 1,588 lines and frame census"** | it is **1,587** lines and one fewer `buttonCancel` (45 vs 46); the game is identical. §6 now says so, and §1 says the one-frame band swings both ways |
| **`tools/lint-bridge.sh` rule 4b matched the receiver *name* `si.`**, so `top.getKey()` / `item.getKey()` passed silently — the one thing the rule exists to stop | the rule now derives its receivers from every identifier declared `StackItemView` under `bridge/src`, so a rename is caught by construction. Negative-controlled both ways |
| **check-all 10g echoed that six acts "each moved the board"**; `passPriority` is a count | §4.5: the report row carries a `countOnly` flag and both the client summary and the gate echo name it as a count |
| **`tools/check-redaction.mjs` made every M6 comfort key absence a count, never a failure, in every file** — so a bridge that stopped writing `players[].phaseStops` would have passed over all 18 fixtures and every fresh log | absence is now **all-or-nothing**: a file carrying *some* comfort keys and not others is a hard failure ("M6's comfort block is HALF PRESENT"). A file with none is still the legitimate pre-M6/AI-vs-AI case. Negative-controlled two ways (drop the key from every frame; drop it from one). The residual — a seat recording that predates M6 — is what `ten-games.sh` 6b and 10g cover, against a fresh bridge rather than the corpus |
| **the "M6 comfort fields present" summary line claimed `yieldKey` was checked** even for a log whose stack was empty in every frame | the line now names the stack-item count, or says the stack was never non-empty |
| **auto-yield was proven at the store level only**, and the committed proof set its yield on an item with `isAbility:false`, which the engine's ability scope means it can never consult | `--comfort` now prefers a stack item with `isAbility:true` (falling back only after 40 chances) and **measures** the behavioural half — later appearances of the key **on top** of the stack, and prompts pushed while it sat there — printing both. It is measured and not asserted because no seed can be made to guarantee a second occurrence |
| **`tools/check-redaction.mjs` called a correct recording a leak.** A game in which the seat looked at the AI's hand produced a `choose_list` with `reveal: true` carrying that card — and three complaints: the `state` that shows it is flushed by `ask()` *before* the ask (report 06 W4), so A6's "revealed EARLIER in this log" failed by one frame, and P12 did not know `reveal: true` is itself the reveal | two relaxations, each exactly one step wide: an `ask` may justify the `state` **immediately** before it and nothing further back, and a `reveal: true` `choose_list` is its own delayed reveal. Both are negative-controlled in `fixtures/negative/redaction/` — move the ask one frame further, or turn the flag off, and the checker still fails (`check-redaction-selftest.mjs` is now 15 controls, 14 of them probes) |
| **`--comfort` raced the engine for the first `input`, and lost under load.** The probe fired `setPhaseStop` on the FIRST `state` of a game — which the bridge pushes before the engine has asked this seat anything — so `WireGuiGame.applyAct`'s pre-`inputSeen` guard dropped it with `notice {title:"Not yet"}` and step 10g then reported `setPhaseStop=NO EFFECT`. A true statement about a dropped act and a false alarm about the bridge; it passed twice by luck before a loaded machine produced it | `comfortStep()` returns until this game's first `input` has arrived (`pendingInput !== null`, which `nextGame()` clears, because `inputSeen` is reset **per game**) |
| **9b's noise was documented only in PLAN.md** | `tools/fixture-multiset-diff.mjs` now prints a NOTE naming both noisy frame shapes at the point of failure. PLAN.md M5 follow-up 6 records the decision (leave it loud; a filter would hide future defects wearing the same shape) |
| **"phase stops are reseeded per game" was written only here** | **DECISIONS.md D38**, with Forge's desktop behaviour as the rejected alternative |
| **D31 ("the phase strip ships read-only until M6") was contradicted by the browser with no successor entry** | **DECISIONS.md D37** supersedes it, and retracts its hold-priority clause too |

---

## 8b. What the independent verification pass found, and what it changed

One major and seven minors; all closed. PLAN.md §M6 lists all eight. The three
that changed engine-side behaviour or evidence:

| found | fixed |
|---|---|
| **[major] New Game had a 30-second fuse that fired with a client connected.** Both post-`over` waits — the between-games grace and `--keep-open`'s linger — were a flat wall clock that ran whether or not anybody was attached. Measured twice: a socket client connected the whole time never got game 2 of a `--games 2` match, and in the browser the JVM had exited 36 s after the final `over` while **Restart match** was still enabled on screen. `./scripts/play.sh` defaults to `--games 3`, so a human had 30 s after each game to press the button | `MtgTable.awaitNextGame` applies the rule **D24** already gives the ask timeout: **no deadline while a `WsTransport` reports a connected client**, 30 s while none is, and an immediate return once a client that *was* connected leaves — so no scripted client in the gate pays for it. `WsTransport.keepOpen(long)` deleted. **DECISIONS.md D40**. Measured: 40,046 ms of silence with the client connected, then game 2 began 39 ms after the act |
| **`hello_ok.gameNumber` / `.gameCount` were read by the client and written by no emitter**, so the board's game label was the reducer's own count of `gameId`s — which restarts at 1 on a page reload and can never say *of 3* | Emitted, as amendment **M41**, from `WireGuiGame.gamesStarted()` and `--games`; **omitted entirely for a one-game match**, which is why no committed fixture had to be re-recorded and gate step 9b stayed clean |
| **Auto-yield's behaviour was measured, never asserted** (§4.4.1), and the committed proof set its yield on a creature *spell* | `decks/yield-probe.dck`, `--require-yield-repeat`, step 10g, and `fixtures/games/human-yield-13.jsonl`. `human-comfort-13` re-recorded onto a triggered ability and §4's line references redone |

---

## 9. What is still open at the end of the engine half

1. **`order` with `sideboardMode: true`** is still unrecorded (§3). It needs a
   deck whose main/sideboard swap forces a reorder.
2. **`marker` and `stack` yields have no engine recording** — only `endOfTurn`
   does. Both are on the wire and in the synthetic fixture; a browser that offers
   "pass to my next turn" will produce the first.
3. **`input.weak[]` is still `[]`** and `input` still carries no typed
   `payingMana` (M5 follow-up 10, amendment M30). The mana pips remain live
   whenever the pool is non-empty.
4. **The undo race in §4.3** is Forge's own and is caught, not fixed.
5. **`newGame` is absent from the frame log** (§2.3). The client log has it; a
   reader of `var/games/` alone sees only the stderr line and the next game's
   header.
6. **Phase stops are reseeded per game**, not carried across a match. Forge's
   desktop carries them (the labels live on the match UI). Report 11 §13's open
   question 6 said to pick one and write it down — and "written down in an
   evidence file" was not enough, because an evidence file records what was
   measured and a decision has to live where a reader looks for one. It is now
   **DECISIONS.md D38**, with Forge's desktop behaviour as the rejected
   alternative and the comfort cost (a stop set in game 1 must be set again in
   game 2) stated. Measured in the browser: a DRAW stop and an
   UPKEEP-on-the-opponent's-turn stop set in game 1 were both gone from game 2's
   `hello_ok`.

---

## 10. Status, and where M6 is written down (documentation pass, 2026-09-12)

The engine half is **done**, the two verification passes are closed, and as of
this pass the milestone is recorded in the four files a reader actually opens
rather than only in this one:

| file | what it gained |
|---|---|
| `PLAN.md` §M6 | **"What the evidence actually shows"** — the ten bullets this file's numbers support — an **M6 follow-ups** list of **thirteen**, and a **"What M6 hands to M7"** hand-over (what `state.events` carries, measured over the committed corpus; one frame log per game as the first multi-game replay material; the five things a second renderer must not assume away) |
| `DECISIONS.md` | **D41–D45**: the `{own, opp}` phase-stop shape and the turn-keyed act, the opaque `yieldKey` handle, the mana-lost prompt on by default (in memory), one `hello_ok` and one frame log per game, and `Space` following `input.buttons.focus`. §9 item 6 above is the reason this matters: an evidence file records what was *measured*, and a decision has to live where a reader looks for one |
| `CLAUDE.md` | lint **rule 4b** written into hard rule 10 (the `StackItemView.getKey()` budget of one, and why the rule works from the declared type rather than the receiver's name), the console table's `next` / `new`, and a new §*"The conventions M6 added"* — six, including the all-or-nothing comfort block in `check-redaction.mjs` and the two narrow relaxations that want a second reader |
| `README.md` | a **comfort block** in *"Playing in the browser"* (phase stops, Pass-To, auto-yield, Undo, New Game, the floating-mana prompt — each named as the engine feature it renders) and `next` / `new` in the console vocabulary |

§9's open items are now PLAN.md's M6 follow-ups **1, 2, 3, 5 and 6**; item 6
(phase stops reseeded per game) is closed as a *decision* (**D38**) and carried on
that list as its stated comfort cost, follow-up 11.

**The gate, re-run for this pass.** `WSPORT=8666 ./tools/check-all.sh` →
**exit 0 in 711 s** (11 m 51 s), log `var/check-all-m6-docs.log`. `bridge/out`
was **not** deleted first, so it is not strictly a cold run — `bridge/build.sh`
recompiles every source anyway, and the number lands inside the 682–712 s band
of the four M6 runs in §8. What it measured, in its own words:

- step **9c** `TEN GAMES OK`; step **9d** the `sideboard` ask, two games, a legal
  swap;
- step **10g**, three games over one socket in **121.9 s** (slower than §8's
  85.7 s on a machine that was also compiling this documentation):
  `games 3/3 [check-all-ws-3g check-all-ws-3g-g2 check-all-ws-3g-g3]`,
  `comfort setPhaseStop=ok undo=ok setYield=ok yieldTo=ok buttonCancel(yield)=ok
  passPriority=sent(count)`, and the behavioural half of auto-yield asserted:
  `autoYield key=y2 isAbility=true repeats=4 promptsWhileOnTop=0`;
- `check-redaction.mjs` PASS on all three of that session's frame logs and on the
  client's three, each reporting `M6 comfort fields present: phaseStops{own,opp},
  yield, undo, input.buttons.focus, stack[].yieldKey/… (yieldKey asserted
  opaque)` — 48, 201 and 468 stack items respectively;
- step **13**: **455 `node --test` (447 pass, 0 fail, 8 skipped) + 74 vitest**,
  and `npm run build` with zero TypeScript errors.

---

## 11. The 10g race — one dropped act, and the frame that caused it (2026-09-12)

Gate step **10g** failed once, on a loaded machine, in
`var/precommit-m6-check-all.log`:

```
[ws-auto] … comfort setPhaseStop=NO EFFECT undo=not reached setYield=ok
          yieldTo=not reached buttonCancel(yield)=not reached passPriority=not reached
[ws-auto] FAILED: --comfort: setPhaseStop (sent, no effect seen), undo (never reached), …
check-all FAILED at step 10: tools/ws-auto-play.mjs --games 3 --comfort did not
    finish against 127.0.0.1:8666
```

and the server's own stderr said what had happened in four words:
`ACT BEFORE START dropped: setPhaseStop` (`var/check-all-ws-3g.log:43`). Three
standalone reruns of the same step passed (`var/flaky-10g-client-1..3.log`), so
it was a **race, not a regression** — and the steps are sequential, so one
dropped act took the other four rows down with it ("never reached").

### 11.1 What the frame log says

`var/ws-auto-3g.jsonl`, the client's own log of the failing run, lines 1–9:

| # | dir | type | `t` | |
|---|---|---|---|---|
| 1 | c2s | `resync` | …601647 | the client's own, from its `open` handler |
| 2 | s2c | `hello_ok` | …601592 | cached, re-delivered verbatim (M10) |
| 3 | s2c | **`input`** | …601646 | **the connect's re-emission** |
| 4 | s2c | **`input`** | …601649 | **the `resync`'s re-emission** |
| 5 | s2c | `state` | …601728 | the engine's first snapshot |
| 6 | c2s | `act setPhaseStop` | …601730 | the probe, fired on that `state` |
| 7 | s2c | `notice {"title":"Not yet"}` | …601731 | `applyAct`'s pre-input guard |
| 8 | s2c | `state` | …601857 | |
| 9 | s2c | **`input`** | …601858 | **the engine's FIRST real one — 128 ms too late** |

Lines 3 and 4 are the defect. `WsTransport.resend` re-emitted the `input`
through `onResync()` on connect **and** on the explicit `resync`, and before any
engine push the struct behind it is the empty one the seat was constructed with:
`prompt: ""`, both buttons disabled, `selectable.mode: "none"`. The probe's own
guard — added by the verification pass, and correct as far as it went — was
`pendingInput !== null`, which those two frames armed. So **the client's first
`input` was not a truthful proxy for "the engine has asked this seat
something"**, while the bridge's `inputSeen` (armed only by `engineInput`) was
still false. Two flags for one fact, and they disagreed for 128 ms.

### 11.2 The fix, in two halves

**Bridge (the real one).** `WireGuiGame.onResync()` re-emits an `input` **only
once `inputSeen` is armed**; before that it writes its `resync` c2s log line
(§8.2, M16) and returns, so a connect or a resync in the window is `hello_ok` +
`state` and nothing else. `WsTransport` nulls its cached `input` on every
`hello_ok`, so the same is true across a new game (M38). Documented as protocol
amendment **M42** in §2.1 and §2.4: *an `input` frame is only ever delivered
after the engine has asked; a client may treat the first `input` as the
pre-input guard lifting.* The M3 doorstep test's own guarantee is untouched and
strengthened — `onResync` still never *arms* `inputSeen`, and now it does not
emit before it either.

**Probe (the belt).** `tools/ws-auto-play.mjs` treats
`notice {title:"Not yet"}` as what it is: the bridge saying the act never
happened. The comfort step that sent it is **un-sent** (its `*Sent` flag
cleared; `buttonCancel` clears `yieldSeen` too, since that is the edge it fires
from) and re-armed to wait for an `input` that arrives *after* the notice
(`retryAfterInput`), and the retry is counted in the summary line as
`retries=N`. Every existing assertion is unchanged: a step that is retried still
has to produce its effect, and `--require-yield-repeat` still fails a run whose
yielded key never returns. `AutoTransport.java` needs no mirror — it has **no
comfort mode**: `grep -n 'setPhaseStop\|yieldTo\|setYield\|passPriority\|undo'
bridge/src/mtgtable/AutoTransport.java` is empty, and the five acts exist only
over the socket.

### 11.3 Proving it, by forcing the race instead of waiting for it

The gate's own `/health` poll sleeps a whole second between tries, so it almost
never connects inside the ~150 ms window — which is why 10g passed for a week
and then failed once. `var/m42-10g.sh` (a scratch copy of step 10g, same server
flags, same client command, same assertions) takes `FAST_HEALTH=1`, which polls
`/health` every **3 ms** and connects the instant the handshake exists.

| run | bridge | connect | result |
|---|---|---|---|
| `race1` | **with M42** | forced (3 ms poll) | **PASS**, `retries=0`; server printed `RESYNC BEFORE THE FIRST INPUT` **twice** (the connect and the `resync`), and the client's log has **no `input` before the engine's own**: `resync`@…952481, `hello_ok`@…952433, `state`@…952564, `state`@…952695, `input`@…952697 (the engine's first), `setPhaseStop`@…952870 — 173 ms *after* it, not 128 ms before |
| `nocontrol` | **M42 guard disabled** (`if (false && !inputSeen)`, rebuilt) | forced (3 ms poll) | the original defect, reproduced on demand: `input`@…096763, `input`@…096764, `state`@…096844, `act setPhaseStop`@…096846, `notice "Not yet"`@…096846, first engine `input`@…096978 — **132 ms early**, and `ACT BEFORE START dropped: setPhaseStop` on the server. **The run still PASSED**, `retries=1`: the probe un-sent the step, re-sent it after the next real input, and `setPhaseStop=ok` |

The second row is the negative control for both halves at once — it is the
failing run of `var/precommit-m6-check-all.log` on demand, and it is green only
because of the probe's retry. The guard was restored and the bridge rebuilt
immediately afterwards.

### 11.4 Five reruns under load

Step 10g's command, five times in a row, **each with the race forced**
(`FAST_HEALTH=1`) and **each under load**: two further `--transport ws` servers
and their `ws-auto-play` clients looping whole games on ports 8668 and 8669 for
the duration (`var/m42-load.sh`, 16 cores, 30 GB).

| run | 10g result | `retries` | pre-input resyncs skipped | dropped acts | client wall |
|---|---|---|---|---|---|
| run1 | **PASS** | 0 | 2 | none | 123.3 s |
| run2 | **PASS** | 0 | 2 | none | 123.4 s |
| run3 | **PASS** | 0 | 2 | none | 123.2 s |
| run4 | **PASS** | 0 | 2 | none | 123.1 s |
| run5 | **PASS** | 0 | 2 | none | 123.4 s |
| run6 | **PASS** | 0 | 2 | none | 123.1 s |

Six, not five, and the sixth is bookkeeping: an inert guard was added to
`comfortNotYet` after run1 (it refuses to un-send a step whose effect has
already been seen — unreachable by argument, stated anyway), so runs 2–6 are
five consecutive runs of the *final* file. Every run asserts what the gate
asserts: `MTGTABLE OK`, `games = 3 played of 3`, three frame logs each with one
`hello_ok`, one terminal `over` and a clean `check-redaction.mjs`, the server's
`M6 acts = newGame 2, setYield 1, yieldTo 1, setPhaseStop 1, undo 1` line, and
`autoYield key=y2 isAbility=true repeats=4 promptsWhileOnTop=0`.

Two numbers say the race was really run. **`pre-input resyncs skipped: 2` in
every one** — the connect's implicit resync and the client's own `resync` frame
both landed inside the window, and both were answered with `hello_ok` + `state`
and no `input`. **`ACT BEFORE START dropped:` appears in none of the six**,
against a pre-M42 bridge that produced it on demand under the same timing
(§11.3). The load beside them: **46 further `--transport ws` games** (23 on port
8668, 23 on 8669), each a whole `ws-auto-play` session, running continuously for
the duration; the machine is 16 cores / 30 GB, and 10g's own wall time moved by
0.3 s across the six.

### 11.5 The whole gate

`WSPORT=8668 ./tools/check-all.sh` from a **deleted `bridge/out`** →
**exit 0 in 712 s** (11 m 52 s), log `var/m42-check-all.log`. That is the top of
the 682–712 s band §8 records for a clean M6 run, and nothing in this change
adds work to the gate. What it says in its own words:

- step **9c** `TEN GAMES OK`; step **9d** the `sideboard` ask, two games, a legal
  swap;
- step **10g**: `comfort setPhaseStop=ok undo=ok setYield=ok yieldTo=ok
  buttonCancel(yield)=ok passPriority=sent(count) **retries=0** · autoYield
  key=y2 isAbility=true repeats=4 promptsWhileOnTop=0`, three games, three ids,
  three logs, `check-redaction.mjs` clean on all six copies;
- steps **11** and **12**: every committed fixture, every fresh recording, and
  the checker's fifteen negative controls;
- step **13**: `tsc --noEmit` clean, `vite build` clean, and
  **456 `node --test` (448 pass, 0 fail, 8 skipped) + 75 vitest** — one more in
  each suite than M6 shipped with, which are the two tests this change added
  (`web/test/ws.test.ts`'s connect-with-no-`input`, and `board-m6.test.tsx`'s
  render from `hello_ok` + `state` alone).

**And one honest gap.** `RESYNC BEFORE THE FIRST INPUT` appears **zero** times
across all seven of the gate's ws servers: its `/health` poll sleeps a second
between tries, so no client in the gate connects inside the window, and the gate
therefore does not exercise M42's branch at all — it only proves the branch
broke nothing. The branch's coverage is §11.3's forced-race runs, which are a
scratch harness (`var/m42-10g.sh`, `FAST_HEALTH=1`) and not part of
`check-all.sh`. Closing that would be an eighth ws server, or a fast poll on
one of the seven. It is the same shape as M6 follow-up 7 (D40's fix is evidenced
and not gated) and it is **named here rather than added to PLAN.md's list**,
which this change deliberately left at thirteen — the 10g race itself was never
on it.

### 11.6 What a reader should take from it

- **A flag that two ends keep separately will disagree.** The client's
  `pendingInput` and the bridge's `inputSeen` were the same fact held twice; the
  fix is not a third flag but a wire rule that makes one of them derivable —
  §2.1's "the first `input` is the guard lifting".
- **The verification pass's one-line fix was necessary and not sufficient**, and
  the reason it looked sufficient is that it was tested against a bridge that
  kept sending the frame it was guarding against. §8b's row stands; this section
  is its second half.
- **A probe that reports "sent, no effect seen" for an act the server said it
  dropped is reporting the wrong thing.** The notice is on the wire, in the
  client's own log, and nothing was reading it.
