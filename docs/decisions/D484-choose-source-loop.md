## D484 — A Circle of Protection's source is never null or a divider on our seats, and a branch's deadline is read at every decision (amends D467)

*Branch `pc/d484-choose-source-loop`, on origin/main `bf978690` (#211, D483, merged). `node tools/decisions.mjs next` gave
D484. Amends **D467**: its step clock reads the deadline on every game event, and D467's javadoc said a step that fires
no event at all "still reaches the unit's watchdog; none has been seen". J167 saw one.*

**2026-10-25**

**Context.** J167 (2026-10-25): spine s05, pauper, decks
`/home/justin-a/code/lab/data/lab-j166/decks/s05-pauper-2005/decks/pauper-2005-0000{1,2}.dck`, seed 2105, hung **every**
unit of phase B. Deck B holds Circle of Protection: Green and deck A holds Lifeforce. The diagnosis took thread dumps
(`var/j167-s04-diag/dumps-b/` in the main checkout) and reproduced it alone (`var/j167-s04-diag/b-s05`, whose log reads
`worker 0: no answer in 600 s (hung) during d0-random-0`). J167's own evidence is
`/home/justin-a/code/pc-results/results/J167/run3.log` and
`/home/justin-a/code/lab/data/lab-j166/b-s05-pauper-2105/phaseB/`.

**What loops** (Forge 2.0.14's source, read as prose, every call checked against the pinned jar with `javap`):

- The random seat (B) activates the Circle when Forge's AI would not: no attacker, no damage spell on the stack, no
  opposing green creature.
- `ChooseSourceEffect.resolve` builds the choice list with divider cards (`new Card(-1..-4, game)` named
  `"--PERMANENTS:--"`, `"--SPELLS ON THE STACK:--"` and so on, in no zone) and loops
  `do { o = chooser.chooseSingleEntityForEffect(...) } while (o == null || o.getName().startsWith("--"))`.
- `ChooseSourceAi.chooseSingleCard`'s `NeedsPrevention` branch finds no threat on the stack or in combat, then keeps the
  options that are **not** (a creature the seat owns), dividers included, and asks `ComputerUtilCard.getBestCreatureAI`. That
  returns a one-element list's only element without filtering (`ComputerUtilCard.java:597`), so a list of one divider gives the
  divider. Any larger list is filtered to creatures, so with none it gives null. Each answer repeats forever.
- Each re-ask goes through `PolicyControllerAi.chooseSingleEntityForEffect`, which wrote a decision record: about 20,000 a
  second, seat 1's frame log 1.45 GB in J167. The records were `[option:52, option:74, option:hidden]` chosen
  `option:hidden` (B's own two green creatures and the divider), or the heading and A's Lifeforce (`option:40`) chosen `pass` (null).
  No game event fires, so D467's step clock never read the 120-s deadline and the 30-minute unit kill (D459) ended it.
- The stack: `ChooseSourceAi.chooseCardOnStack:168` ← `ChooseSourceAi.chooseSingleCard:108` ←
  `SpellAbilityAi.chooseSingleEntity:321` ← `PlayerControllerAi.chooseSingleEntityForEffect:340` ←
  `PolicyControllerAi.chooseSingleEntityForEffect:633` ← `ChooseSourceEffect.resolve:132` ← `MagicStack.resolveStack:611`
  ← `PhaseHandler.mainLoopStep:1143` ← `Atlas.play:770`.
- Upstream fixed it in Forge commit `746455d75` (2026-09-15, "Cherry pick AI fixes": `fallbackSources`, the options
  without the `--` headings). That is after 2.0.14, which stays pinned (D109). 62 scripts in the pinned `res/` use
  `ChooseSource` with `AILogic$ NeedsPrevention` (the Circles and their kin, Auriok Replica, Bone Mask, ...).

**Decision.**

1. **`PolicyControllerAi.chooseSingleEntityForEffect` answers a ChooseSource question itself when Forge's answer is
   null or a divider** (`chooseSourceGuard`, `PolicyControllerAi.java`). A divider is a `Card` with a negative id and
   a name starting `--` (`isDivider`). The answer is upstream's (`chooseSourceFallback`), over the options that are
   not dividers:
   - the best creature the seat does not own (`ComputerUtilCard.getBestCreatureAI`, over creatures only);
   - else a random noncreature permanent the seat owns;
   - else a random option.

   The random draws are `Aggregates.random`, which is `MyRandom`: the stream `Atlas.play` seeds per branch, so a branch
   still replays from its seed. Forge's own answer stands whenever it is a real card. The guard sits before play
   exploration and the decision record, so the record carries the answer actually played, with `why: "CHOOSE_SOURCE"`
   (the redaction checker's `^[A-Z_]+$`). The seat counts it as `chooseSourceGuard`. A branch row carries the count of
   both seats when it is above 0 (`Atlas.Branch.chooseSourceGuard`, `BranchRow.chooseSourceGuard` in
   `tools/cubelab/atlas.ts`).
   - Re-asking Forge with the dividers removed is **not** enough: with no creature among the options, its answer is
     still null.
   - **Every seat built on `PolicyControllerAi` has the guard**: the lab's seats, the bench's, the atlas's. **Forge's
     plain AI seat does not.** `Bootstrap.createAiPlayer` (`play.sh`'s AI, `RecordMatch`'s seats) is Forge's own
     `PlayerControllerAi` and is not changed here (see *Not fixed here*).
2. **A deadline read at every decision, and a cap on one record repeated**, both in the move atlas's branch games only
   (`DecisionClock`, `AtlasController`). This is the general backstop for any question Forge re-asks without an event,
   not just this one.
   - **The deadline.** Each `AtlasController` carries a `DecisionClock`. `Atlas.play` arms it with the deadline it already
     computes (D467) next to the step clock, and disarms it with the step clock (`Atlas.disarm`). It reads the
     deadline at the top of every decision callback the controller overrides, 24 of them:
     - eleven of the twelve `PolicyControllerAi` overrides (all but `tuckCardsViaMulligan`, asked once per mulligan);
     - `chooseEntitiesForEffect`, `chooseSingleSpellForEffect`, `chooseSpellAbilitiesForEffect`, `confirmPayment`,
       `confirmReplacementEffect`, `chooseNumber` (the five-argument one), `chooseBinary` (the `Map` one),
       `chooseColor`, `chooseSomeType`, `chooseModeForAbility`, `chooseSingleCardForZoneChange`,
       `chooseCardsForZoneChange` and `chooseSingleReplacementEffect`.

     Past the deadline it throws `Atlas.BranchTimeout`, now with a message constructor:
     `the branch's deadline passed at a decision (<callback>, <n> decisions into its play)`. It is D467's `Error`, so it
     crosses Forge's `catch (Exception)` blocks; no `catch (Throwable|Error)` exists in forge-ai, and
     `AbilityFactory.getAbility`'s is unwrapped by `Atlas.timeoutIn` as before. `Atlas.play`'s catch scores the branch
     the way D467 does: `timedOut`, `engineError`, no result.
   - **The cap.** `AtlasController.setDecisionSink` wraps the seat's recorder. The 1,000th consecutive record that
     repeats the one before it (the same kind, source, options, hidden count, answer and policy at the same
     `stateSeq`) throws the same `BranchTimeout`, naming the repeated ask: `the same choice decision (entity, options
     [...], chosen option:hidden) was asked 1000 times in a row at stateSeq 84 (no new state frame between)`. A loop
     like s05's then costs milliseconds and a few hundred kilobytes, not 120 s and a gigabyte. A record the seat does
     not write is not counted (a forced one, or a branch played without frames); the deadline still applies to it.
   - **No new thread and no game-thread hop** (hard rule 3; the lint's `HOP_ALLOW` stays three). The clock is two
     field reads and `System.nanoTime()` on the game thread that is already asking.
   - **What it does not cover.** The clock reads at the *entry* of a callback. A callback that never returns, such as
     D482's Scute Swarm board, where Forge's attack prediction runs for 1,000 s inside one step, is still the unit
     watchdog's. D482's follow-up (c) stays open for that case.
3. **Self-tests.**
   - **`DecisionSelfTest.decisionClock`** (engine-free, in `bridge/build.sh`; 7 checks). It runs the
     `ChooseSourceEffect` loop shape around a planted chooser that always answers null and fires nothing:
     - with no recorder, the 100-ms deadline ends it at a decision well inside 2 s, with no stack trace, naming
       the callback, and `timeoutIn` finds it inside a wrapper;
     - a disarmed clock never throws;
     - with a recorder and an hour's deadline, the planted divider answer is stopped by the cap at exactly the 1,000th
       ask, with 999 records written and a message naming kind, answer and `stateSeq`;
     - controls: a new `stateSeq`, an alternating answer and a disarmed clock never reach the cap.

     `DecisionSelfTest` boots no engine, which is why the engine cases below are in the bench's self-test.
   - **`tools/ai-bench.sh --selftest`'s "choose source" cases** (engine, 15 checks; not in the gate, like the rest of
     that self-test). The AI seat B controls Circle of Protection: Green and two Plains. It activates the Circle with
     `ComputerUtil.handlePlayingSpellAbility`, and the stack resolves through `PhaseHandler.mainLoopStep` on the
     scenario's game thread. The self-test waits 10 s for it (`scenario(..., waitS, ...)`), so a regression fails and
     does not hang. The cases:
     - **(a) null:** A controls Lifeforce, no creatures. Forge answered nothing; the guard chose Lifeforce.
     - **(b) divider:** B's only green source is its own Grizzly Bears, so Forge's list is the one divider. Forge
       answered the divider; the guard chose the Bears.
     - **(c) control:** A controls Grizzly Bears. Forge's own answer, the Bears; the guard never acts.

     Each case asserts that the stack emptied, how many times the guard answered and which card it chose, and that
     the Circle's prevention effect is in B's command zone. That effect exists only when a real card was chosen
     (`ConditionDefined$ ChosenCard`). **The negative control:** with the guard switched off (`if (true || ...)`,
     compiled into `bridge/out` alone and reverted), (a) and (b) each failed with `timed out after 10 s`, and the
     self-test ended in 35 s with exit 1.

**Evidence.**

- **`./bridge/build.sh`**: the lint, its self-test, javac, every build self-test; `decision selftest: 194 check(s), 0
  failure(s)`.
- **`./tools/ai-bench.sh --selftest`**: `205 check(s), 0 failure(s)` in 15 s, and again on the gate's build.
- **The gate**: `rm -rf bridge/out && ./tools/make-forge-home.sh && WSPORT=9800 GATE_JOBS=4 ./tools/check-all.sh`,
  `check-all OK`, 509.9 s wall, 59 jobs (`var/check-all/20261025-115149-3954208`; node 1862 pass, 11 skipped, 0 fail).
- **The reproduction**, J167's s05 shape (`CUBELAB_HOME_ROOT=var/d484-homes timeout 900 tools/cubelab.sh atlas --deck-a
  <s05 deck 1> --deck-b <s05 deck 2> --seed 2105 --phase b --decisions 2 --min-options 3 --screen 5 --early-stop 5,10,15
  --branch-random 25 --branch-forge 0 --chunk 5 --checks-parallel 1 --unit-timeout 10 --jobs 1 --out var/d484-s05`):
  - **Before** (the diagnosis' `b-s05`, the same flags): the worker hung on `d0-random-o1-b3` and was killed at 600 s.
    Seat 1's frame log for that branch was 449,367,036 bytes gzipped when it was killed.
  - **After:** `d0-random-o1-b3` played in 2,918 ms, a loss for A, with `chooseSourceGuard: 4` and no error, and its two
    frame logs are 112 kB and 126 kB.
  - The whole run finished in 367 s: 180 branch games at d0 and d13, **0 timed out, 0 errors**, and atlas checks clean
    (7,249 rows, 362 frame logs, 2 leak checks). The guard answered 212 times in 23 branches, and there are 212 records
    with `why: "CHOOSE_SOURCE"` in the frame logs, all 26 MB of them. A first run on the build before the `why` mark had
    the same 180 rows, field for field.
  - **The fix changes nothing else.** The 25 branch rows the pre-fix reproduction finished before its hang, and the 10
    of J167's lab rows (`b-s05-pauper-2105`) at the same keys, are identical to this run's: same result, turns and steps.
    J167's lab run had killed five units there (`no answer in 1800 s (hung)`, two attempts each).
- **s04's shape, re-run once** (deck `s04-powered-2004`, seed 2104, the same flags): no Circle, so the guard
  never answered (`chooseSourceGuard` absent from all 342 rows), and 0 timeouts and 0 errors. The 900-s `timeout` of the
  command line stopped it at 342 branch games, while it was still moving at about 1,400 games an hour. D480's screen keeps
  replacing settled decisions, so this spine branches at eleven. **323 of those rows have the same key as the diagnosis'
  pre-fix s04 run** (`var/j167-s04-diag/a`, the same seed and cuts with `--decisions 8`), **and all 323 are identical**:
  same result, turns and steps.

**Not fixed here.**

- **The plain Forge seat can hang a real game the same way.** `play.sh`'s AI and `RecordMatch`'s seats are Forge's own
  `PlayerControllerAi`. Forge's AI activates a Circle only against a threat, but if the threat that justified it is
  gone before the ability resolves (the attacker removed, the damage spell countered), the resolution reaches the same
  null-or-divider answer and loops. That is Forge's seat, outside this lane: the fix would be a seam in front of
  Forge's controller on the live seat, a change to what `play.sh` plays against, and so a decision of its own. An
  official release with `746455d75` fixes it at the source (report 14 §0).
- **D482's lab follow-ups**: (a) a resumed unit skipping a stalled branch, and (b) a thread dump before the unit
  watchdog's SIGKILL. They are now *partly* covered by part 2. A question re-asked without an event no longer reaches
  the watchdog, since it costs at most the branch timeout, and seconds when the seat records. A step that never
  returns, D482's own case, still does, so (a), (b) and (c) stay open as D482 wrote them.
- The guard's `why: "CHOOSE_SOURCE"` is a new value in the decision record's `why`. `tools/ml/policy_data.py` keeps
  `why` as data and drops no row for it (atlas games are `NOT_FOR_TRAINING` anyway, D451).

## Follow-ups from the skeptic review (2026-10-25, before the merge)

- **The search's rollouts have no guard.** `RolloutController` (which `RecordingController` extends) is a
  plain `PlayerControllerAi`, and `SearchPolicy.playout` reads its deadline only between steps, so a rollout
  that reaches the Circle loop would hang a live, ladder or lab search seat for good — as rare as for the plain
  seat, since the search only tries a Circle activation Forge's AI would make itself (WillPlay needs a threat).
  "Every seat built on `PolicyControllerAi`" above does not include it. Not fixed here.
- **Callbacks not wrapped by the decision clock:** the `Boolean` overload of `chooseBinary` (Forge's
  3-argument `chooseBinary`, six call sites), `chooseNumber(sa, title, min, max)`, `chooseNumber(values)`,
  `chooseCardsForEffectMultiple`, `notifyOfValue`, `chooseCounterType`, `chooseColors`, `chooseCardName`,
  `payManaCost`. None is known to be re-asked in a loop (`DigMultipleEffect`'s `while(true)` cannot loop with
  the AI); a coverage gap, not a wrong claim.
- **Fewer slow branches score as draws.** Under D478 a branch whose deadline passes between steps scores as a
  draw; with the clock a slow branch usually stops at its next decision instead, an engine error with no
  result. D467 already did most of this (J158: 2 timeouts between steps against 241 inside a step).
- The baseline game of a spine runs `PolicyLobbyPlayerAi` seats too (`CubeLab.java:531`), so it is guarded as
  well; a baseline that reached the loop before this fix hung and left no listing.
- When the cap fires, its message carries up to eight option tokens (ids or `option:hidden`, never a name)
  into the branch row's `error`; `SeatRecorder.crashed()` writes no message, so nothing reaches a frame log.
