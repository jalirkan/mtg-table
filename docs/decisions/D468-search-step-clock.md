## D468 — The search's playout reads its deadline inside an engine step too: D467's clock on every rollout copy, two seconds late (amends D467)

*Branch `pc/search-step-clock`. `node tools/decisions.mjs next` gave D468. Amends **D467**, closing the
follow-up it left open ("the search seat has the same exposure").*

**2026-10-23**

**Context.** D467 armed `Atlas.StepClock` on the move atlas's branch copies and left the search alone.
`SearchPolicy.playout` reads `lim.deadline` only between `mainLoopStep` calls (every 8th step), so a
rollout whose copy reaches a step that never returns, like the Ocelot Pride cascade in D467, holds the
calling seat's decision and the game thread until the step ends. In practice it never does. The live hint
was already covered, because the hint runner kills its engine at budget + 60 s. These were not:
- a live game against `--ai-policy search`;
- the ladder's, SPRT's and the census's search seats (ai-bench);
- the coach Grader's review rollouts (`mtgtable.grade`).

All of them reach the copy through `playout`.

**Decision.**

1. **`playout` arms an `Atlas.StepClock` on the copy right after it is made**
   (`SearchPolicy.java`, `copy.subscribeToEvents(clock)` after the copy step). It disarms the clock when
   the step loop ends, so scoring the leaf is never cut. It disarms it again in the existing `finally`,
   which also puts back the real `MyRandom`. There is no new thread and no hop onto the game thread
   (hard rule 3).
2. **The clock fires `SearchPolicy.STEP_GRACE_NS` (2 s) after the playout's deadline, not at it.** The
   ai-bench smoke below shows why. A search spends its budget up to the deadline, so its last rollout
   usually straddles it. The loop's own check lets that rollout finish its step and up to 7 more, and
   keeps the result if the rollout ends inside them. A clock armed at the bare deadline cut **461**
   rollouts in **39** ordinary games (1,038 searched decisions, 27,907 rollouts). That would have changed
   rounds and budget fallbacks. Two seconds is two of Forge's own rollout think limits
   (`copy.AI_TIMEOUT = 1`), far longer than any ordinary step, and short next to a step that never ends.
3. **A step timeout is answered null, never thrown, and counted on its own.** `BranchTimeout` is an
   `Error`, so a caller's `catch (RuntimeException)` would not see it. `playout` catches
   `Atlas.BranchTimeout | RuntimeException` and asks `SearchPolicy.stepTimedOut`, which uses
   `Atlas.timeoutIn` to find the throw directly or inside a wrapper: Forge's `AbilityFactory`, or our own
   `CandidateUnmappable` when the install step fires events. On a timeout, `playout` returns null, which
   is the answer it already gives when the deadline passes between steps. Each caller then does what it
   already does with null:
   - the search drops the round and sets `timedOut`, and may fall back on budget;
   - the prior stops ranking;
   - Grader and `Rollout` score `NaN` and count a timeout.

   Anything else is rethrown unchanged. The timeout is also counted once, as **`search.stepTimeouts`**
   (**`search.prior.stepTimeouts`** for the ranking's until-applied playouts), beside the existing
   counters. The ladder's match tally (`tools/ai-ladder/match.ts`) sums both into a new `stepTimeouts`
   field, which `tallyLine` writes on every match line (0 when none, and when reading lines from before
   the counter). `cli.ts` prints it when it is not zero. The redaction checker reads `counters` as a map
   of numbers, so it needed no change.

**What it changes.** Nothing in the search's answers, except on a step still running 2 s past the
playout's deadline. That rollout is now null, where it used to hold the decision until the step ended,
and usually forever. It is the same unwinding D465 and D467 already accept: the copy is mid-resolution and
discarded, its event bus and tracker are its own, and `playout` already let any `RuntimeException` out of
a step unwind its copy the same way (`search.rolloutErrors`).

**D467's LOW: a step that fires no event.** The clock reads time only when the copy fires an event, so a
step that loops without firing any still escapes it. For the search seat, nothing else catches that step
except the hint runner's kill. There is no fix here, only a check that the premise holds on real play. The
engine case below subscribes a gap counter to six ordinary rollout copies. In the run below, every copy
fired at least 195 events over its play (24 turns in all), and the longest silence between two events in
any copy was **2 ms**. A step silent for 2 s would be a new kind of hang. Nothing in D467's evidence or
here has shown one.

**Evidence.**
- **`DecisionSelfTest.searchStepClock`** (engine-free, in `bridge/build.sh`, 4 checks). It plants a step
  that never returns on a Guava `EventBus("game events")` with a nested post, inside the same catch
  `playout` has. The clock's throw must come back as a null answer within 2 s, counted once as
  `search.stepTimeouts`. The same holds when the throw is wrapped as `AbilityFactory` wraps it (counted
  under the prior's key) or as `CandidateUnmappable`. Its control: an engine bug thrown before the
  deadline is rethrown and counted nowhere. `decision selftest: 159 check(s), 0 failure(s)`.
- **`tools/ai-bench.sh --selftest`, "the search's step clock (D468, engine)"** (3 checks). It runs the
  real `playout` on a real copy, with the probe firing `GameEventShuffle` on the copy forever.
  - The playout returned null 200 ms after its deadline (this run had the clock at the bare deadline),
    with `search.stepTimeouts=1` (and `search.prior.stepTimeouts=1` for an until-applied playout),
    nothing thrown, and `MyRandom` restored.
  - Control: six normal rollouts all finished, with no step timeout.
  - `ai-bench selftest: 96 check(s), 0 failure(s)`. The check now expects the null at deadline + grace.
    That rerun is still owed, because J158 started before it could run (see *Not run*).
- **`web/test/ai-ladder.test.ts`**: the tally sums both keys, gives 0 for a side with none, and gives 0
  for a tally from before the counter. 40 of 40 pass.
- **`./tools/cubelab.sh atlas-selftest --jobs 1`**: OK and unchanged, because the atlas makes its copies
  with `copyForAtlas`, not `playout`.
- **The smoke that found decision 2.** `ai-bench.sh play --pairs tools/ai-bench/pairs-cube.txt --a
  Default+search --b Default`, 39 games. It was stopped once J158 started.

**Not run.** The full gate. A rebuild and engine rerun with the 2 s grace in place: the lab's J158 began
mid-lane, so the grace was checked by compiling against the pinned jar and running the lint only. Owed
before merge:
- `bridge/build.sh`;
- `tools/ai-bench.sh --selftest`;
- a short `+search` smoke, which should show `stepTimeouts` 0.

**Rejected.**
- **The clock at the bare deadline.** It cut the ordinary last rollout of a search (decision 2).
- **Counting a step timeout as a budget fallback.** It is a different event, and the ladder's
  budget-fallback rate is a tracked number that it would have inflated without saying why.
- **Catching it in each caller.** There are five callers in three packages, and the `Error` would cross
  any one that forgot. `playout` is the one place that made the copy.
