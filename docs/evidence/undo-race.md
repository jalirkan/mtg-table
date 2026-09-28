## The undo race — `undo` waits for a parked engine (2026-09-28, D136, amendment M48)

Worked in the worktree `/home/justin-a/code/mtg-table-t2t` on branch
`undo-race`, from `main` at `4408283`, and rebased onto the gate-speed lane's
`6b35054` (§10). The decision is **D136** — written as D170 on the lane's
instruction and renumbered at merge, after the story page's D124–D128 and the
gate-speed lane's D129–D135 — and the protocol amendment **M48**, which kept its
number. PLAN.md *The undo race* has the status and the five follow-ups.

Everything here was run on the user's desktop (16 cores, OpenJDK 21 JRE, Forge
2.0.14, jar sha256 `3c0a7c38…8e5dd9`) at a load average of 2–12 from other
worktrees. Ports 8800–8809. Every Forge fact below was read from the pinned jar
with `javap -c -p`; none was taken from a source checkout.

| # | What | Result |
|---|---|---|
| 1 | The defect, from the story branch's gate run and the jar | `act: undo` applied on the EDT while `Game-0` walked `MagicStack`'s undo stack (§1) |
| 2 | A reproduction that runs the same way every run | `tools/undo-race-repro.sh`: guarded, the undo is refused and the stack untouched; guard off, the stack is written under a held engine thread (§2) |
| 3 | Every case of `applyAct`, classified | 2 guarded (`undo`, `useMana`), 1 guarded differently (`concede`, found by §5), 13 left to Forge's input protocol or the bridge, each with its reason (§3) |
| 4 | The guard and its self-test | 8 conditions; `ActGuardSelfTest` 39 checks; each condition removed fails its row (§4) |
| 5 | Natural timing, thirty seeds each way | the unguarded undo lands with no input up in 30/30 and crashed nothing; the concede race crashed `Game-0` in 2 of 30 guarded runs before the concede was guarded, 0 after (§5) |
| 6 | Gate step 10g | the late undo refused inside the held window, `undo`'s effect proved by a parked undo (§6) |
| 7 | The full gate from a deleted `bridge/out` | §8 |

---

### 1. The defect

**The crash.** The story branch's first gate run (`var/check-all-story-run1-ws-3g.log`
in that worktree, read only) failed at step 10g:

```
Game-0 > java.lang.ArrayIndexOutOfBoundsException: Array index out of range: 0
	at java.base/java.util.Vector.remove(Vector.java:844)
	at forge.game.zone.MagicStack.clearUndoStack(MagicStack.java:223)
	at forge.game.zone.MagicStack.clearUndoStack(MagicStack.java:232)
	at forge.game.zone.MagicStack.recordUndoableActions(MagicStack.java:508)
	at forge.game.zone.MagicStack.add(MagicStack.java:270)
	...
	at forge.game.phase.PhaseHandler.mainGameLoop(PhaseHandler.java:1035)
ENGINE CRASHED on Game-0: java.lang.ArrayIndexOutOfBoundsException: Array index out of range: 0
```

and its summary read `M6 acts = … undo 1`. M6's evidence §4.3 records the same
race throwing `Array index out of range: 1` out of `undoLastAction()` on the
EDT, where `applyAct` caught it.

**The mechanism, from the jar.**

- `MagicStack.undoStack` is a `java.util.Stack` (so a `Vector`: each call
  synchronised, no sequence of calls atomic). `clearUndoStack(List)` iterates a
  copy and, per entry, calls `lastIndexOf(sa)` and then `remove(int)`.
  `clearUndoStack()` is reached from `recordUndoableActions` whenever a
  non-undoable spell ability is added to the stack (`MagicStack.add`, offset
  117 — the first call in the method that does any work).
- `PlayerControllerHuman.undoLastAction()` → `tryUndoLastAction()` →
  `canUndoLastAction()` (the undo stack's owner is this player and priority is
  this player's) → `MagicStack.undo()`: `peek`, `sa.undo()`, then
  `clearUndoStack(sa)` — a `lastIndexOf` and a `remove` of its own. No input is
  consulted.
- The bridge called it from `mtg-table-EDT` whenever `act: undo` arrived
  (`applyAct`, `case "undo"`).
- **Where the one state that offers the undo is emitted.** The policy pays a
  Thallid's `{G}` with `Auto`: `InputPayMana.onOk` sets `locked` on the EDT and
  hands `ComputerUtilMana.payManaCost` to a `Game-n` worker
  (`GameAction.invoke` → `ThreadUtil.invokeInGameThread`). The worker taps a
  Forest (the mana ability goes on the undo stack), then `onStateChanged` →
  `done()` → `stop()`. `InputSyncronizedBase.stop()` runs `onStop`, posts
  `setFinished` to the EDT, **removes the input** (`InputQueue.removeInput` →
  `updateObservers`, which flushes our forwarder: the `state` with
  `undo {can:true, depth:1}`), and only then `cdlDone.countDown()`, which
  releases `Game-0` into `MagicStack.add`. So the state that invites the undo
  is sent with no input up, and the engine's next act is to walk the undo
  stack.

---

### 2. The reproduction — the window, held open

**The hook** (`WireGuiGame`, `MTGTABLE_HOLD_UNDO_WINDOW_MS`, off by default).
At the first `state` of a game that offers an undo (`canUndoLastAction()`,
depth > 0) while the seat's input stack is **empty**, the flushing game thread
arms a hold before the frame goes out and then spins (RUNNABLE, as a thread in
the engine is) for the given time. Once an undo has arrived during a hold it
holds no more. **The client** (`tools/ws-auto-play.mjs --undo-race`) sends
`undo` the instant the first such state arrives, waits 2.5 s for a
`notice {title:"Not now"}`, and concedes. **The driver**
(`tools/undo-race-repro.sh`, ~15 s) runs it twice at seed 13 on
`decks/yield-probe.dck`, with a 1500 ms hold.

The held thread is `Game-1` in every run — the payment worker, inside `stop()`,
between removing the input and releasing `Game-0`.

| run | client | `undo window` line (the server's summary) | the hook | concede |
|---|---|---|---|---|
| guarded | exit **0**, "Not now" 1 ms after the act | `1 hold(s), … mutated … 0 time(s); acts during a hold: 1 refused, 0 applied` | `undo window released; the undo stack is untouched (depth 1)` | `0 at once, 1 deferred` |
| `MTGTABLE_TEST_UNGUARDED_ACTS=1` | exit **9**, no notice in 2500 ms | `1 hold(s), … mutated … 1 time(s); acts during a hold: 0 refused, 1 applied` | `UNDO STACK MUTATED UNDER A RUNNING ENGINE THREAD: depth 1 -> 0 while Game-1 was held inside the engine` | `1 at once, 0 deferred` |

The guarded refusal's reason is `no input is up: the engine is running, not
parked on this seat`. The negative control is the pre-D136 code path by
construction: with the switch on, `notNow` returns before anything is refused.

**What the hold shows, and what it does not.** Held, the EDT's write and the
engine's walk are serialised: the undo lands entirely inside the hold, and
`Game-0` resumes onto a stack changed under it. That is the precondition of the
crash made to happen every run — an undo-stack write from the EDT while an engine
thread is between the payment and `clearUndoStack`. The
`ArrayIndexOutOfBoundsException` itself needs the EDT's `remove` to fall between
`Game-0`'s `lastIndexOf` and its `remove`, and no hook of ours can stop a thread
inside Forge's loop; §5 counts how often that happens at natural timing. In the
held run Forge's undo soft-fails (`SpellAbility.undo()` finds the mana already
spent, so `MagicStack.undo()` clears the stack and refunds nothing), the Forest
stays tapped and the Thallid resolves: the stack was written, and nothing else
visible changed.

```
$ ./tools/undo-race-repro.sh
  ok    guarded: the client exited 0 (got 0)
  ok    guarded: the server printed MTGTABLE OK
  ok    guarded: the server held the undo window once
  ok    guarded: the undo stack was untouched across the hold, the act refused
  ok    guarded: the server refused it with the reason "no input is up"
  ok    guarded: the client was told "Not now"
  ok    guarded: its concede, sent while the window was held, was deferred to the engine's own check
  ok    unguarded: the client exited 9 (got 9)
  ok    unguarded: the server printed MTGTABLE OK
  ok    unguarded: the server held the undo window once
  ok    unguarded (negative control): the undo stack was MUTATED under the held engine thread
  ok    unguarded (negative control): the hook saw it happen
  ok    unguarded (negative control): the concede was applied at once, from the EDT
undo-race-repro: OK -- guarded refuses the late undo, the guard off lets it write under a running engine thread
```

---

### 3. Every case of `applyAct`

Before the first engine `input` of a game every act but `concede` is dropped with
`Not yet` (M42) and `concede` ends the session (M11); both unchanged. After it:

| act | what it reaches in the 2.0.14 jar | verdict |
|---|---|---|
| `clickCard` | `selectCard` → `InputProxy.selectCard`, which resolves the input at the moment of the call → `InputBase.selectCard`, which returns false on a finished input → the input's `onCardSelected`. `InputPassPriority` stops (the work happens on `Game-0`); `InputPayMana.activateManaAbility` refuses while `locked` and otherwise sets it and hands the activation to a worker; `InputAttack`/`InputBlock`/target inputs write input-owned state on the EDT while `Game-0` is parked in that very input | **left to Forge's input protocol** — the call desktop Forge makes from its EDT |
| `clickPlayer` | `selectPlayer` → `InputProxy` → `InputBase.selectPlayer` (finished → return) | input protocol |
| `clickAbility` | `selectAbility` → `InputProxy` → the input's `selectAbility` (`InputPassPriority`: choose and stop; `InputPayMana`: `activateManaAbility`, as above) | input protocol |
| `buttonOk` | `selectButtonOk` → `InputBase.selectButtonOK` (finished → return) → `onOk`. `InputPassPriority.onOk` stops, re-renders, or — mana would be lost, D43 — hands the pass to a worker that asks `confirm`; `InputPayMana.onOk` sets `locked` and hands `Auto` to a worker | input protocol; an OK on an `InputPassPriority` that leaves it up is **marked** (D136 condition 6) |
| `buttonCancel` | `selectButtonCancel` → `onCancel` (finished → return) | input protocol |
| `passPriority` | `PlayerControllerHuman.passPriority()`: `selectButtonOK` if the input is an `InputPassPriority`, else nothing | input protocol; **marked** like `buttonOk` |
| `alphaStrike` | `InputProxy.alphaStrike` → `InputAttack` only | input protocol |
| **`useMana`** | `useMana(byte)`: if the input is an `InputPayMana`, `useManaFromPool` → `ManaPool.tryPayCostWithColor` — on the EDT, with no `finished` check and no `locked` check | **guarded** (M48): a direct write outside the protocol |
| **`undo`** | `undoLastAction()` → `MagicStack.undo()` — pops the stack, untaps, refunds; no input consulted | **guarded** (M48) |
| **`concede`** | `PlayerControllerHuman.concede()`: `Player.concede()` (one field, `PlayerStatistics.outcome`), then `GameAction.checkGameOverCondition()` **on the calling thread** — it walks `Game.getPlayers()` and `onPlayerLost` edits it — then `InputQueue.onGameOver` | **guarded differently** (§5): whole when quiet; otherwise the outcome now, the game ended by `Game-0`'s own state-based check, never refused |
| `setPhaseStop` | the bridge's stop map, then `sendYieldUpdate(SkipPhase)` → `YieldController.apply` → `tryAutoPassNow()`, which acts only when the input is an `InputPassPriority` (and may press OK) | not guarded: `YieldController` is written from the EDT by desktop Forge too; the press is the input protocol. Residual: it can start the mana-lost worker unmarked (PLAN follow-up 1) |
| `yieldTo` | `sendYieldUpdate` / `handleYieldMarkerToggle`, then as above | not guarded; the same residual |
| `setYield` | `setTriggerDecision` / `setShouldAutoYield` — the auto-yield store `Game-0` reads, and a press on the `InputConfirm` for that key | not guarded: the store is Forge's own EDT-written design, and the press is the input protocol |
| `newGame` / `nextGame` | M45: held until Forge has finished the game, then `continueMatch()` / `restartMatch()` on the EDT | not guarded: only after `over`, with no game running |
| `resync` | `reEmitInput()` — the bridge's own input struct | safe: touches no engine state |

---

### 4. The guard, and `ActGuardSelfTest`

`ActGuard.whyNotNow(Facts)` is pure; `WireGuiGame.engineFacts` reads the facts on
the EDT immediately before the write, and the write follows on the same thread.
The eight conditions, in order, each with the jar path that makes it necessary:

| # | condition | the path it excludes |
|---|---|---|
| 1 | live: the engine has asked this seat something; not over | M42/M11 |
| 2 | `ReplyPool.pending() == 0` | a parked ask is woken by the transport thread's answer; the woken thread removes its own entry, so the count covers the wake-up lag |
| 3 | an input is up | D39: `Game-0` is in `showAndWait`; `stop()` removes the input before it counts the latch down |
| 4 | the input generation is the one the act arrived under (read in `onAct`) | D22: every `stop()` moves the generation first (`onStop` → `clearActionableCards` → our `clearWeaklySelectable`) |
| 5 | not an `InputPayMana` with `isActivatingManaAbility()` | the activation / `Auto` worker; `locked` is set on the EDT before the hop and cleared on the EDT by `updateMessage` |
| 6 | no OK/pass still with the engine on this `InputPassPriority` | `InputPassPriority.passPriority(Runnable)`'s mana-lost hop, invisible until it asks |
| 7 | none of our hops between submission and end | D39's refresh, D22's ability menu |
| 8 | no game thread that has entered the bridge is RUNNABLE, BLOCKED or NEW | `Game-0` between `setInput` (push, `syncPoint`, `updateObservers` — our flush) and `awaitLatchRelease`; a confirm worker continuing into `stop()` after its answer |

`bridge/build.sh` runs `ActGuardSelfTest` after the other four: **39 checks**. The
table (each condition failing alone refuses, naming itself; with several, the
first in order wins), `busy()` for every `Thread.State`, and real
`mtg-table-bg` threads — one spinning (running), one parked on a latch (not),
one sleeping (not), one BLOCKED on a held monitor (running), one terminated
(not), and the latch one again once released (running).

**Negative control, run.** Each of the eight `if` lines in a scratch copy of
`ActGuard.java` replaced with `if (false)`, compiled over `bridge/out`, and the
self-test run against it: all eight mutants fail — conditions 1 and 3 with 3
failures each (their row, and an order check), the other six with 2 each.

---

### 5. Natural timing — thirty seeds each way, no hold

`--undo-race` against a server with no hold, seeds 1–30, one game each, one
server at a time, `decks/yield-probe.dck`. The client sends `undo` on the first
state that offers one and concedes the moment it has a verdict. Load average
5–12 from other worktrees. (The driver is a scratch script, not committed; its
per-seed line is the server's exit code, the client's, and counts of
`ENGINE CRASHED`, `NOT NOW`, `CONCEDE DEFERRED` and `OVER WITHOUT A gameOver
STATE` in the server's log.)

| sweep | build | undo | engine crashes | other failures |
|---|---|---|---|---|
| unguarded | `MTGTABLE_TEST_UNGUARDED_ACTS=1` | applied in **30/30**, each where the guard would have said *"no input is up"* | **0** | 0 |
| guarded, first | the undo guard; `concede` as before D136 | refused in 30/30 | **2** — `ConcurrentModificationException` on `Game-0` in `Game.copyLastState` (seed 15) and in `GameAction.checkGameOverCondition` (seed 17), each right after the client's concede | 1 — seed 24 ended in an `over` with no `gameOver` state (the client's exit 8), the same concede racing the engine's own game end |
| guarded, final | the undo guard and the deferred concede | refused in 30/30; concede deferred in 30/30 | **0** | 0 |

Two things follow.

- **At natural timing the undo race enters its window every time and almost
  never completes the crash.** 30 of 30 unguarded undos were written with no
  input up — between the payment's `stop()` and `Game-0`'s walk — and none threw.
  The `ArrayIndexOutOfBoundsException` needs the EDT's `remove` inside
  `Game-0`'s `lastIndexOf`→`remove` gap; the story run met it at gate load. A
  second scratch experiment (not committed) held the window 300 ms and made the
  unguarded EDT spin until the hold released before writing, to start both
  writers together: **0 crashes in 30**. That is why the reproduction (§2) holds
  the window rather than hoping for the interleave, and why the guard refuses on
  the window rather than on the exception.
- **The sweep found the concede race.** `ws-auto-play --undo-race` concedes the
  instant its undo is refused, which is while the engine is still running
  toward the stack, and `PlayerControllerHuman.concede()` runs
  `checkGameOverCondition()` on the calling thread. Twice in thirty it met
  `Game-0` inside the player list. That is what moved `concede` into D136
  (§3), and the final sweep is its before/after.

---

### 6. Gate step 10g

10g's server now runs with `MTGTABLE_HOLD_UNDO_WINDOW_MS=1000` beside
`MTGTABLE_HOLD_GAME_END_MS=2000`, and its client with `--require-late-undo`.
`--comfort`'s undo is now two steps:

- **2a, the late undo**: on the first state that offers an undo — the payment's
  `stop()` flush, held — send `undo` at once. `--require-late-undo` fails the run
  (exit 7) unless it drew "Not now".
- **2b, the effect** (M6 convention 4): once 2a has its verdict, at priority in a
  main phase with the stack and the pool empty, click one of the seat's own
  untapped lands — Forge activates its mana ability, the undo stack holds it —
  and send `undo` on the state that offers it; the step is proven when
  `undo.depth` falls. A "Not now" (the state that offers the undo is flushed by
  `Game-0` before it parks) un-sends it and it is re-sent after 150 ms; a
  "Not selectable" on the land (a stale view of which land is untapped) lets the
  next state choose again.

Before D136, 10g's single undo was sent on the first state that offered one —
the window of 2a — and passed whenever the race fell the right way; with the
policy's `Auto` payments there is no parked moment that offers an undo at all
unless the seat floats mana, which is why 2b makes one.

By hand, three games at seed 13 on `decks/yield-probe.dck` (116.7 s):
`lateUndo=not-now`, `COMFORT undo: depth 1 -> 0 (0 "Not now" retries first)`,
`M6 acts = newGame 2, setYield 1, yieldTo 1, setPhaseStop 1, undo 1` (the
existing gate line: `undo` now counts undos **applied**), `acts not now = undo 1,
useMana 0`, `undo window = 1 hold(s), … mutated … 0 time(s); … 1 refused, 0
applied`, every comfort effect `ok`, `repeats=4 promptsWhileOnTop=0`. The first
float attempt at 5.1 s drew "Not selectable" (the land it read as untapped had
paid for the Thallid) and the retry rule above was added for it.

`useMana` is guarded too: `./tools/ten-games.sh --seed 4` (the row that asserts
`useMana`'s effect) passed — `useMana x18 (pool dropped after 7 of 18)`,
`acts not now = undo 0, useMana 0` — and a 10f-shaped `--probe` game over the
socket at seed 42 reached `over` with 7 `clickAbility` and nothing refused.

---

### 7. What did not change

- **No fourth hop.** Hard rule 3's three hops are unchanged; D136 argues why a
  hop for the undo would have excluded nothing.
- **Nothing under `web/`.** `Not now` is an ordinary warn `notice` — the board
  toasts it, `web/src/protocol.ts` already types it — so no reader was needed.
- **Slice 4's follow-up 13(d)** (the ask's push order against `over`) is a
  different defect and is untouched.

---

### 8. The full gate

`rm -rf bridge/out && WSPORT=8800 ./tools/check-all.sh 2>&1 | tee
var/check-all-undo-race.log`: **exit 0, 908 s**, at a load average of 2–6 from
other worktrees.

- `bridge/build.sh`: the lint, then five self-tests, `ActGuardSelfTest: 39
  check(s), 0 failure(s)` the fifth.
- Step 6 `wire-drift: SAME`; 6b `SAME GAME`; 9c's fourteen games in 368 s; 12d
  `narrate self-test OK: 106 checks`.
- **10g**: `lateUndo=not-now undoNotNow=0`, `undo(late)=ok`, every comfort
  effect `ok`, `repeats=4 promptsWhileOnTop=0`; the server's
  `M6 acts = newGame 2, setYield 1, yieldTo 1, setPhaseStop 1, undo 1`,
  `acts not now = undo 1, useMana 0`, `undo window = 1 hold(s), … mutated … 0
  time(s); … 1 refused, 0 applied`; the gate's new line `OK: the late undo, sent
  into the held window between the payment and the stack, was refused "Not now"
  (D136)`.
- Step 8's scripted console concede (`q` after four Enters) arrived while the
  engine was running: `CONCEDE DEFERRED … no input is up`, then `CONCEDE
  COMPLETED: the engine parked on this seat before it ended the game` — the
  deferred path end to end, in the gate, with `over` last. The seven ws servers
  of step 10 conceded 2 at once and 0 deferred between them, plus 10e's
  pre-input concede (M11, unchanged).
- `npm --prefix web test` inside the gate: **903 `node --test` (895 pass, 0
  fail, 8 skipped) + 98 vitest (7 files)** — the counts spectating and the
  narrator left, because nothing under `web/` changed.

---

### 9. The user's Forge install

`/home/justin-a/forge` (22,128 paths; the jar's sha256 still `3c0a7c38…8e5dd9`)
and `/home/justin-a/.forge` (27 paths, 7 files, every file's sha1) were
fingerprinted — paths, sizes and mtimes — before this lane's first command and
after the gate: **unchanged**.

---

### 10. At merge — rebased onto gate speed's `6b35054`

The branch was rebased onto `main`'s `6b35054` (the story page, D124–D128, and
the gate-speed lane, D129–D135, had landed). Two files conflicted, DECISIONS.md
and PLAN.md, both prose, and each kept both sides with `main`'s first.
`tools/check-all.sh` merged on its own: this branch's three 10g changes — the
`MTGTABLE_HOLD_UNDO_WINDOW_MS=1000` hold on the server, `--require-late-undo`
on the client, the server-side `undo window` assertion — landed inside the
`s10g_three` job of the job table, whose port, Forge home and log are the
scheduler's, and the job table did not change. `bridge/build.sh` was untouched
on `main`, so it runs the five self-tests as before. **D170 became D136** in
every file that cites it; **M48 kept its number**.

Run from the worktree after the last edit to `tools/check-all.sh`, each gate
from a deleted `bridge/out`:

| run | `GATE_JOBS` | `WSPORT` | wall | 10g's job | load (1 min) | log |
|---|---|---|---|---|---|---|
| p1 | 4 | 8800 | **238.6 s**, exit 0 (46 jobs, 933.8 s summed) | 121.9 s | 2.0 → 7.9 | `var/check-all-undo-race-merge-p1.log`, run `20260928-143442-3650768` |
| p2 | 4 | 8810 | **242.0 s**, exit 0 (46 jobs, 950.6 s summed) | 121.7 s | 6.4 → 11.1 | `var/check-all-undo-race-merge-p2.log`, run `20260928-143858-3674691` |
| s1 | 1 | 8820 | **907.4 s**, exit 0 (30 jobs; 9c's fourteen games 371.2 s) | 120.4 s | 10.5 → 2.0 | `var/check-all-undo-race-merge-s1.log`, run `20260928-144309-3699580` |

A parallel run's console carries only each job's start and end lines, so its
10g assertions are in that run's `var/check-all/<run>/10g-three.log` (and its
`gate.log`); the serial run's log carries them itself. In all three: the
client's `lateUndo=not-now undoNotNow=0` and `undo(late)=ok`,
`repeats=4 promptsWhileOnTop=0`; the server's `M6 acts = newGame 2, setYield 1,
yieldTo 1, setPhaseStop 1, undo 1`, `acts not now = undo 1, useMana 0` and
`undo window = 1 hold(s), … mutated … 0 time(s); … 1 refused, 0 applied`; and
the gate's line `OK: the late undo, sent into the held window between the
payment and the stack, was refused "Not now" (D136)`. The server and client
logs of each run are copied under `var/undo-race-merge/`, because the next run
overwrites `var/check-all-ws-3g*.log`. `ActGuardSelfTest: 39 check(s), 0
failure(s)`, step 6 `SAME`, 6b `SAME GAME`, 12d 106 checks; `npm --prefix web
test` inside the serial gate **942 `node --test` (934 pass, 0 fail, 8 skipped)
+ 120 vitest (8 files)**, and standalone **932 + 120** — `main`'s counts,
because nothing under `web/` changed. `./tools/undo-race-repro.sh`: 13 of 13,
14.5 s (`var/undo-race-repro-merge.log`).

**Gate speed's follow-up 8 — step 8's scripted concede.** `main`'s gate-speed
lane recorded it twice (its evidence §3.3): the console session's `q` arrived
while `Game-0` was in `GameAction.runPreOpeningHandActions`, and
`Game.forEachCardInGame` threw `ConcurrentModificationException`. Read with
`javap -c` on the pinned jar: `forEachCardInGame` iterates `Game.getPlayers()`,
and the concede the EDT ran then, `PlayerControllerHuman.concede()`, goes through
`checkGameOverCondition` to `Game.onPlayerLost`, which calls
`PlayerCollection.remove` on that same list — the player-list walk this lane's
natural-timing sweep (§5) caught in `copyLastState` and
`checkGameOverCondition`. Since D136 a concede with no input up writes only
`Player.concede()` (`setOutcome`, one field) and nothing of ours touches the list.
All three merge runs show step 8 on that path: `CONCEDE DEFERRED … no input is
up: the engine is running`, then `CONCEDE COMPLETED: the engine parked on this
seat before it ended the game` and `concedes = 0 at once, 1 deferred`, with
`over` last. The race depends on load and was not forced here, so this closes it
by mechanism. The follow-up is marked closed in PLAN.md.

`/home/justin-a/forge` (22,128 paths, the jar's sha256 still `3c0a7c38…8e5dd9`)
and `/home/justin-a/.forge` (7 files) were fingerprinted again before the rebase
and after the serial run: **unchanged**.
