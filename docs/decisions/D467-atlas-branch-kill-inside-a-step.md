## D467 — The atlas's branch timeout is read inside an engine step: a clock on the copy's event bus ends a branch that never leaves one step (amends D451, D465)

*Branch `pc/atlas-hung-branch`. `node tools/decisions.mjs next` gave D467. Amends **D451** (a branch's
timeout) and **D465** (a branch's `Error`s are engine errors).*

**2026-10-23**

**Context.** One branch of the move atlas hangs every time: the vintage pair
(`tools/ai-bench/decks/sets/vintage-900000007-{A,B}.dck`), spine seed 458, decision 9 (an attack), option 0
(`attack:17,19`), branch 165, random continuation — `d9-random-o0-b165`. In J156 its unit `d9-random-150`
was killed twice by the unit watchdog (`no answer in 1800 s (hung)`) at 75 of 125 branches, and in J157, on
`9fe69ad8`, again. The 120 s branch timeout never fired.

**What loops.** Nothing loops forever; it grows too fast to finish. Seat B's deck has Ocelot Pride and
Fable of the Mirror-Breaker. Reflection of Kiki-Jiki copies Ocelot Pride each turn, and Ocelot Pride's end-step
trigger copies every token that entered this turn, the Ocelot copies among them (Forge's script
`o/ocelot_pride.txt`: `DBMassTokens: DB$ CopyPermanent | Condition$ Blessing | Defined$ Valid
Card.token+YouCtrl+ThisTurnEntered`). By turn 16 seat B has the card and 17 token copies, so 18 triggers go
on the stack at its end step. Each one copies every token that entered this turn, so each resolution doubles
them: after 18 there are 2^18 times as many as the first trigger made. Each token's entry walks every card in the game for
replacement effects, so one resolution's cost grows with the square of the battlefield. Read from J156's
truncated frame logs: seat B's battlefield went from 61 permanents to 1,083 in 15 s, 3,278 at 2.5 min and
8,243 at 30 min, with 7 of the triggers still on the stack. All of it happened inside ONE
`PhaseHandler.mainLoopStep` call, and no player was asked anything: the random seats made no choice
after turn 16's blocks.

Replayed alone (a one-unit job, `i0 = 165, i1 = 166`, so option 0 at branch 165 plays first), the game
thread's stack at 84 s and at 151 s was the same:
`Atlas.play` (`Atlas.java:606` at `9fe69ad8`, the `mainLoopStep` call) → `MagicStack.resolveStack:611` →
`WrappedAbility.resolve:440` → `CopyPermanentEffect.resolve:264` → `TokenEffectBase.makeTokenTable:164`
(`moveToPlay`, once per token) → `GameAction.changeZone:334` → `ReplacementHandler.run:209` →
`getReplacementList:102` → `Game.forEachCardInGame:760`. These are the pinned 2.0.14 jar's line numbers.

**Why 120 s did not fire.** `Atlas.play` read the deadline only *between* `mainLoopStep` calls
(`(steps & 15) == 0`), and this step never returned. Java 21 cannot stop a thread from outside
(`Thread.stop` throws), so the only way to end the step is from inside the game thread.

**Decision.**

1. **`Atlas.StepClock`**, subscribed to the branch copy's event bus before its loop, reads the deadline
   on every event the copy fires. A token entering the battlefield fires one. Once the deadline has passed,
   the clock throws **`Atlas.BranchTimeout`**, which unwinds out of the step.
   - **It is an `Error`, not an exception,** because of how Guava dispatches. `Game.fireEvent` is
     `EventBus.post` (javap). Guava's `Subscriber.invokeSubscriberMethod` rethrows a subscriber's `Error`
     unchanged (javap, offsets 84–102), but hands any `Exception` to the bus's handler, which logs it and
     moves on. The `Error` also passes Forge's own `catch (Exception)` blocks.
   - **`AbilityFactory.getAbility` is the one place in forge-game that catches `Error`.** It rethrows the
     `Error` wrapped in a `RuntimeException`, so `Atlas.timeoutIn` looks for a `BranchTimeout` in the
     cause chain.
   - **The clock is disarmed when the loop ends,** so the copy's own ending can fire events freely
     (`setGameOver`, the recorders' last frames).
2. **The branch is scored as an engine error.** Its row says `timedOut: true` and `engineError: true`,
   with no result, and the error names where it stood, e.g.
   `BranchTimeout: the branch's deadline passed inside one engine step (9835 events into its play) at turn
   16 END_OF_TURN, step 329`. This is D465's catch: the copy is mid-resolution, so it is let go, its frame
   logs end with the engine-error notice and an `over`, and the unit goes on with its next branch. A branch
   that times out *between* steps is still a draw, as before.
3. **No guardrail G6.** The seat that chose made no choice during the hang. This is Forge playing the
   cards' rules, not a random seat repeating a move that does nothing, so a cutoff for moves that change
   nothing would not have caught it.

**What it rests on.** It is the same unwinding D465 already accepts for an `OutOfMemoryError` thrown
anywhere in a step:
- the copy is discarded;
- its tracker, event bus (Guava's per-thread dispatch queue is cleared in a `finally`) and ledger are its
  own;
- the real `MyRandom` is put back in `Atlas.play`'s `finally`.

There is no new thread and no hop onto the game thread (hard rule 3).

**Evidence.**
- **Replay of the branch.** `d9-random-o0-b165` with `--branch-timeout 30`: the branch ended at 30,002 ms
  (`timedOut`, `engineError`, turn 16, step 329). Its two frame logs pass `gzip -t` and end in a notice
  and an `over`. Options 1–4 of branch 165 then played normally (1.2–5.0 s each), and the unit's match
  line was written after 46 s of wall time in all.
- **The engine-free test, `DecisionSelfTest.stepClock`** (in `bridge/build.sh`, 5 checks). It plants a
  step that never comes back: it posts forever, with a nested post, to an `EventBus("game events")` built
  as Forge builds its own. The clock must throw it out within 2 s of a 100 ms deadline. Its controls:
  - Guava swallows a subscriber's `RuntimeException`;
  - a disarmed clock throws nothing;
  - the throw is found inside a Forge wrapper and nowhere else.
- **`atlas-selftest`** passed (`--jobs 1`).

**Not fixed here: the search seat has the same exposure.** `SearchPolicy.playout` also reads its deadline
only between `mainLoopStep` calls (`SearchPolicy.java:2600`). A rollout whose copy reaches this cascade
would hold the live or ladder seat's decision, and with it the game thread, until the cascade ends. That is
practically never, since nothing outside the step can stop it. The same clock fits there: the playout would
return null, its "deadline passed" answer. That is a change to the live seat, so it is left as a follow-up.
In a real game that reaches the position itself, Forge hangs whoever is playing; no clock in our code
changes that.

**Rejected.**
- **A watchdog thread that kills the worker at the branch's deadline.** It would mean a new thread name
  (hard rule 10), and the pool would replay the hung branch on its next attempt, since there is no row for
  it. The unit watchdog already does this, 30 minutes late.
- **A cap on tokens or permanents.** That is a rule the engine does not have, written into the lab.
- **A guardrail G6.** See decision 3.
