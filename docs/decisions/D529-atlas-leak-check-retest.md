## D529 — the atlas's no-leak check tells a leak from a branch Forge does not replay exactly: the redeal must reach the copy before the determinize and leave the fork equal after it, and a first redealt replay that moved is replayed four more times a side — a leak only when the outcome sets share nothing and the base reproduced; non-determinism and unresolved moves are warnings, three of them over a night a problem (amends D451 point 6)

*Branch `pc/atlas-leak-recheck`, off main `137b2bf6` (D528's merge). `node tools/decisions.mjs next` printed D529, the
number this lane was handed. Amends D451 point 6 (the fork's checks, the no-leak check). Touches
`bridge/src/mtgtable/ai/Atlas.java` (the no-leak check, its fork probe and digest), a new engine-free
`bridge/src/mtgtable/ai/LeakVerdict.java`, `DecisionSelfTest.java`, `tools/cubelab/atlas.ts` (the rows, the checks,
the self-test), a new `web/test/cubelab-atlas-leak.test.ts`, the release's column text in `tools/atlas/release.py`,
the cube-lab guide, the evidence and PLAN.md; nothing a branch game, a phase A game or a baseline plays changes (*Why
it lands between landings*, below). A skeptic's review of the first version (twelve items, none blocking) is folded
in: the three-way rule after a retest, the redeal's before-half, the control's digest per row, the retest's budget,
the night cap and the perturbed self-test leg came from it. A second skeptic's review (one blocker, the night cap
enforced per atlas run where a run is one spine, and three fixes) is folded in too: the cap is now a night-level rule
in code (point 5), and points 1, 4, 6 and 7 carry its notes.*

**2026-11-09**

**Context.**

- **J203 failed on its one check that is about hidden information.** Its runner verdict `v.checks.leaks == 0` read
  `1` of 128 no-leak checks: spine `J186-b-s04-powered-2543`, row `atlas:d34:forge:o0:b0` (an attack decision on turn
  26, the Forge map, option 0, branch 0, seed 38540324683130). Seat A's rows moved when only seat B's hidden cards
  were dealt again in the real game; the negative control moved, as it must. It was the first no-leak check to move on
  any atlas night, and it touched no reading (the decision is in J203's control set, both options scored 1.0).
- **It is not a leak; the branch is not deterministic** (diagnosed the same night, with uncommitted instrumentation in
  `Atlas.java`, on one worker against the night's data). After `Determinizer.determinize` the copy's hands and
  libraries were identical, card id by card id in order, for the base and for every redealt replay — as they must be:
  the determinize sorts seat B's hidden cards by name then id, shuffles them with the branch's seeded source and deals
  them back, ids kept (D312, D498), so the arrangement the real-game redeal made cannot survive it. Replayed with
  nothing changed, seat A's rows came out one of two ways, both sides alike, the result (a win in 31 turns) the same
  every time. Three runs with the sides recorded (the dumps' `rep<n>-base` and `rep<n>-swapped` files): 9 base and 9
  redeal replays with the rare outcome on 1 base and 3 redeal; 11 and 11 with 1 base and 1 redeal (this run reproduced
  the night's failure, its first base replay on the rare outcome); 9 and 9 with none. In all, the rare outcome on 2 of
  29 base replays and 4 of 29 redeal replays: 6 of 58, p ≈ 0.10.
- **The cause is in the pinned Forge 2.0.14 jar.** The first difference is turn 27: Goblin Rabblemaster forces Goblin
  Engineer and a Goblin token to attack a planeswalker. `AiAttackController` (lines 886–955 of its 2.0.14 source) runs
  one `CompletableFuture.supplyAsync` per attacker, and each forced attacker is added under `synchronized(combat)`
  (938–942) in whichever order the threads finish; `AiBlockController.sortPotentialAttackers` (163–170) then does
  only a stable sort by power, so with two attackers of equal power the race decides which one meets the best blocker.
  Forge's 5 s AI timeouts (201 on J203) can make a replay part from its seed the same way.
- **D451's check could not tell the two apart.** It compared one base replay with one redealt replay
  (`leakSame = base.equals(swapped)`); any branch that does not replay exactly from its seed fails it at the branch's
  own flip rate, leak or not.

**Decision.**

1. **The redeal must reach the copy, and must not survive the determinize** (`Atlas.ForkProbe`). Each of the check's
   replays (the base, the redeal, the control) records two things on its copy. *Before* `Determinizer.determinize`:
   seat B's hand and library card id by card id in order (`hiddenArrangement`). *After* it, at the point the fork's
   state is probed: the fork digest (`forkDigest`) — the branch's seed, the turn and phase, and for each seat its life
   and its hand, library, battlefield, graveyard, exile and command zone card id by card id in order (a face-down card
   marked), then the stack's sources. Ids only, compared in memory, never written. The test is **different before,
   equal after**:
   - **before equal** between base and redeal (`leakRedealApplied: false`): the redeal reached nothing and the check
     tested nothing — a problem when seat B had two or more cards the redeal could move (`leakRedealable`), a warning
     when it had fewer (nothing to test). The real-game redeal is drawn again, up to 8 times from the same seeded
     source (`REDEAL_TRIES`), while a draw leaves seat B's cards where they were, so at real library sizes a problem
     here is a fault, not chance. *(Second review, note 7.)* With exactly 2 cards to move, a draw leaves them in place
     with probability ½ and all 8 do with 1/256, so at that size "the redeal tested nothing" can be chance (about 0.4%
     of such checks); with 3 cards it is 1/6⁸, and it is negligible beyond;
   - **after different** between a stable base and a stable redeal: the redeal reached the fork, **a leak**, whatever
     the outcomes (`leakForkSame: false`), even when no outcome moved;
   - **after different among one side's own replays** (the base's digests disagree among themselves, or the
     redeal's): the copier did not reproduce the fork from its seed — **`forkUnstable`, a problem of its own, not a
     leak**.
   Cost: about a hundred ids a replay, no game; it runs on every check.
2. **The negative control must move the digest on every check** (`controlForkMoved`, `controlSwap`). The control swaps
   seat A's hand for as many cards from its shuffled library; the new hand's ids are not the old hand's, and the
   determinize keeps the hand seat A holds, so the digest moves by construction whenever a card was swapped. A check
   where it did not is a problem. The one legitimate stand-still: seat A's hand or library empty, nothing swapped
   (`controlSwap: 0`) — a warning. The self-test asserts it row by row.
3. **The behavioural re-test, only when the first redealt replay's outcome moved and the digests agree.** The base and
   the redeal are each replayed `LeakVerdict.RETESTS` = **4** more times, alternately (whatever drifts over the minutes —
   load, the JIT, a timeout — falls on both sides), with the same redeal: it is one fixed arrangement, drawn from
   `seed ^ 0x5AA5L`. The outcome signatures are what D451's `leakSame` compared (seat A's state at the fork, the result,
   seat A's rows but their wall time), and `LeakVerdict.classify` reads all ten replays, the first pair included:
   - one signature in all: **`same`** (only where a self-test forced the retest);
   - the base's and the redeal's sets **overlap**: **`nondeterministic`**, a warning (`checks.leakNondeterministic`);
   - the sets are **disjoint and the base reproduced** (one base signature in five): **a leak**;
   - the sets are **disjoint and the base itself varied**: **`unresolved`**, a separate counted warning
     (`checks.leakUnresolved`) — with many possible outcomes (timeouts) disjoint sets are what chance gives.
4. **How often each reading is wrong.** For a branch with **two outcomes**, no leak, flipping at rate p, a false leak
   needs all five base replays on one outcome and all five redeal replays on the other: p⁴(1−p)⁴ given the first move,
   **0.39% at the worst** (p = ½), 0.0066% at J203's p ≈ 0.10. That is a two-outcome bound. With **more outcomes**
   (simulated, outcomes equally likely, given a first move): this lane's first version — disjoint sets alone a leak —
   would read a false leak 0.9% of the time with 4 outcomes, 9% with 10, and always when every replay differs;
   requiring the base to reproduce brings the false leak to about 0.12% with 4, 0.01% with 10 and none when all
   differ, and the rest of the disjoint cases are `unresolved` (about 0.8% with 4, 9% with 10, all of them when every
   replay differs). The other side: **a partial leak on a
   branch that is itself non-deterministic** — the redeal shifts the odds of outcomes the base also shows — is caught
   only when the base reproduces and every redeal replay lands outside the base's outcomes; with r that chance for one
   redeal replay, about r⁴ of the time after a first move: 6% at r = 0.5, 41% at r = 0.8. D451's rule caught it on
   every first move, and a larger K lowers the catch further. The mitigating argument: the redeal is one fixed
   arrangement, so a leak on a branch that replays exactly gives the same different outcome every time and is caught
   at any K — and by the digest before any outcome is read, if the arrangement reaches the fork at all. And the
   night cap below, which reads every spine of the night together.
5. **The night cap** (`LEAK_UNRESOLVED_CAP` = 3 in `tools/cubelab/atlas.ts`): non-deterministic plus unresolved checks
   reaching 3 **over a night** — every spine's atlas run summed — is a problem. One such branch is Forge's race; a real
   leak mechanism would show on many checks, and J186–J203 saw one moved check in all their nights. **It is a
   night-level rule, not a per-run one** (the second review's blocker): one atlas run is one spine, and only a unit's
   first chunk (`i0` 0) carries a check, so a run holds about two (J203: 128 over 61 spines) and three in one run would
   almost never happen. So each run's `atlas.json` counts its own (`leakNondeterministic`, `leakUnresolved`, as
   warnings, never a problem however many), and the cap is applied where the runs are read together:
   `nightLeakChecks` in `tools/cubelab/atlas.ts`, exposed as **`tools/cubelab.sh atlas-leaks <atlas.json | spine
   folder>...`** (no engine). It sums every run's leak counts key by key, applies the cap (one more `leakFaults` when
   it trips), names each run with a leak or a fault, and prints one JSON object with the counts at its top level
   (`leaks`, `leakFaults`, `leakNondeterministic`, `leakUnresolved`, …, `capped`, `ok`, `problems`, `warnings`); exit
   0 when `leaks` and `leakFaults` are both 0, 3 otherwise, 2 when a file cannot be read. **A night job's verdict calls
   it** over every spine's `atlas.json` and checks `leaks == 0` and `leakFaults == 0` from its output, instead of
   summing the runs' `checks` itself (J186–J203's job files summed `leaks` and `leakChecks` in their own Python, which
   would not see the cap).
6. **The retest has a wall budget** (`LeakVerdict.RETEST_BUDGET_MS` = 600 s). A pair of replays starts only while the
   time spent plus two replays at the branch deadline (`--branch-timeout`, 120 s) fits in it, so the retest never runs
   past it. J148's longest unit took 976 s (D459), its no-leak check's first three replays included: 976 + 600 = 1,576
   s, about 26 minutes, inside the 30-minute unit watchdog (`UNIT_TIMEOUT_MIN_DEFAULT`). A retest that runs out is
   **`incomplete`** — "moved, retest incomplete", a problem — never left for the watchdog to kill the unit. J203's moved
   branch took 11.7 s, so its retest would take about a minute and a half. *(Second review, note 6.)* The budget is
   fixed while `--branch-timeout` is not: a pair starts only while spent + 2 × branch timeout ≤ 600 s, so above 300 s
   no retest pair starts (at 300 s at most the first) and every moved check reads `incomplete`; all four pairs fit only
   when the replays are short of the deadline (at 120 s, four pairs of full-deadline replays would not).
7. **Reporting.** `leakSame` keeps meaning what the lab's verdicts already read — **false only for a leak**, by the
   rules above — so `checks.leaks` and the runner's `v.checks.leaks == 0` are unchanged in meaning and in every reader.
   On the row that carried the check: `leakMoved` (the first redealt replay moved: D451's `leakSame`, negated),
   `leakForkSame`, `leakRedealApplied`, `leakRedealable`, `controlForkMoved`, `controlSwap`, and, when a retest ran,
   `leakRetest` {`base`, `redeal` replays, `baseDistinct`, `redealDistinct`, `shared`, `verdict`}, where `verdict` is
   one of `same`, `nondeterministic`, `leak`, `unresolved`, `incomplete` or `forkUnstable`. In `atlas.json`'s checks
   (`leakChecksReport`): `leakChecks`, `leaks`, `leakControlsMoved` as before, then `leakMoved`,
   `leakNondeterministic`, `leakUnresolved`, `leakRetestIncomplete`, `leakForkUnstable`, `leakForkChecked`,
   `leakRedealApplied`, `leakRedealNothing`, `leakControlForkMoved`, `leakControlEmpty`, and **`leakFaults`**: the
   problems that are not leaks (an incomplete retest, an unstable fork, a redeal that tested nothing, a control that
   did not move the digest; the night cap is not a run's, point 5). *(Second review, note 5.)* `incomplete` wraps
   whatever the retest had read when it stopped, a partial leak reading included, so a check that might have been a
   leak and ran out of budget lands in `leakFaults`, not `leaks` — which is why a night reads `leakFaults` as a
   problem beside `leaks`. A night job's verdict reads both through `tools/cubelab.sh atlas-leaks` (point 5):
   `leaks == 0` and `leakFaults == 0` over the night; `checks.leaks` alone does not see the faults. Each problem line
   names its case and its first row's key; the warnings are `checks.warnings` (D478's addendum: "worth a look, never
   exit 3"), and `atlas.md`'s checks paragraph counts both. A row written before D529 carries `leakSame` in D451's
   meaning (false on any first move) and none of the new keys; before J203 no night's row had it false (J203's
   summary: the first check to move on any atlas night), and J203's own row keeps its `false`.
8. **The verdict is engine-free** (`LeakVerdict.classify` and `LeakVerdict.retest`, a clock and the replays handed
   in). A move with no retest to read (which the bridge never hands it) stays a leak, D451's rule.
   `DecisionSelfTest` holds it on strings and a fake clock in the build.
9. **A self-test switch, never a night's**: `MTGTABLE_ATLAS_LEAK_RETEST` in the worker's environment. `always` runs
   the retest on every check whose digests agree (the self-test's `--only` leg: a branch that replays exactly reads
   `same`, one signature a side); `perturb` changes the first redealt replay's signature, so the moved path — the
   retest because it moved, the alternating loop, the verdict written, the warning — runs on a real game (the
   self-test's `--only-perturb` leg: `nondeterministic`, one warning, exit 0). Lab nights leave it unset; any other
   value is refused by `atlasCommand` before anything runs, and by the bridge as a check that fails to run.

**The known limit, recorded.** In the pinned Forge 2.0.14, **a branch with forced attackers of equal power, and any
branch an AI timeout touches, cannot be replayed exactly from its seed.** On J203 at most 281 of its 10,720 branch
games (2.6%), in 6 of its 62 spine folders, had a qualifying forced attack (an upper bound: the forced attack had to
happen with two such attackers, and the race had to fall the other way), and the night had 201 AI timeouts. **The
published rows and labels stand**: no hidden information is involved — each branch is one legal game Forge played from
the fork, and a label is a mean over branches, not a claim that any one branch replays. What cannot be done for such a
branch is to replay it bit for bit, which the atlas never relies on beyond the no-leak check and D511's unit replay of
the baseline (whose divergence check already excludes a unit that parts from its baseline).

**Why it lands between landings (D509).** D509 freezes `bridge/src` while a population runs unless the lane argues
that the seat's plays and listings are unchanged; the night's checks are what point 2 of D509 lets land. The argument:
the probe is taken only when a caller passes a `ForkProbe`, which only the no-leak check's replays do — the public
`Atlas.play` that every branch game, ai-bench scenario and self-test plays passes null; the redeal's redraws and the
retest are reached only from `leakCheck`; the check's replays write no frames and put their rows in a scratch folder
deleted after it; `LeakVerdict` is new and reached from nowhere else; `StepClock`, `BranchTimeout`, `timeoutIn` and
`unavailableIn`, which the search uses, are untouched. On a night whose checks all stay put — every night before J203
— every unit plays what it played before, byte for byte, unless a real-game redeal's first draw left seat B's cards
where they were, which redraws it. On a night with a check that moves, the eight extra replays advance Forge's static
id counters for the whole worker — every later unit that worker plays, not only that unit's later branches. That does
not change the seat: a worker's history already varies with the pool's scheduling and D465's re-runs, a label is a
mean over branches, and such a night failed `atlas.problems` until now; the nights J186–J203 are not re-read.
`fixtures/cubelab/seat-identity.json` and `CubeLab.java` are untouched.

**Rejected.**

- **One extra base replay** (J203's summary proposed it: a base that moves too is non-determinism). It catches a
  false alarm only when that one replay lands on the other outcome: given a first pair that differed, half the time
  over which side flipped, and only p of the time — about 10% at J203's rate — when the first base had the common
  outcome. And it would excuse a real leak on a branch that is also non-deterministic whenever the base flips once.
- **Re-ordering forced attackers by card id after Forge declares them** (a hook after `AiAttackController` adds them,
  so `sortPotentialAttackers` meets them in one order). It would make those branches reproducible, but it changes play
  on a path nobody has measured — every forced attack of every Forge seat in every lab game, not only the check — and
  AI timeouts make exact replay unattainable anyway.
- **Retesting every check.** Eight more branch games on each of a night's ~128 checks is about 1,000 branch games
  (J203 played 10,720) to learn nothing on the 127 that did not move.
- **Another K.** K trades the two errors of point 4 against each other: eight a side cuts the two-outcome worst false
  leak from 0.39% to 0.0015% but doubles the cost on a moved check and lowers the catch of a partial leak on a
  non-deterministic branch from r⁴ to r⁸ (6% to 0.4% at r = 0.5); three raises the false leak to 1.6%. Four, with the
  base required to reproduce and the night cap (over the night's spines) behind it, keeps both small.
- **Making a moved check a warning outright.** The no-leak check is the one J203's job kept on purpose; a systematic
  difference must still fail the night.

**Tests.** `bridge/build.sh`'s `mtgtable.ai.DecisionSelfTest`: point 3's readings on strings (non-determinism over two
outcomes and J203's shape, a leak with the base reproduced and with a varying redeal, unresolved, a moved digest with
no outcome moving, a fork unstable on one side, same with and without a forced retest, a move with no retest, the
refusal) and the retest on a fake clock (four pairs inside the budget; two pairs then `incomplete`; none then
`incomplete`). `web/test/cubelab-atlas-leak.test.ts`: `leakChecksReport`'s problems, warnings and `leakFaults` for each
case, and none of them a cap however many moves one run has; `nightLeakChecks` (ten non-deterministic checks over ten
runs trip the night cap, two over two do not, unresolved counts with non-deterministic, leaks and `leakFaults` pass
through summed, a run with no checks a warning, a run from before D529 read with 0 for the new keys) and
`atlas-leaks` on files (a folder or its `atlas.json`, exit 0, 3 at the cap, 2 on a missing file or none named); the
bridge's constants and the switch's values; and the command through the real pool
and a fake `java`, a check of each kind (non-determinism and unresolved exit 0, a leak by the retest and by the digest
exit 3, an incomplete retest, an unstable fork and a redeal that tested nothing exit 3 with `leaks` 0), and an unknown
switch value refused. `tools/cubelab.sh atlas-selftest`: every no-leak check of every leg, row by row — no leak, the
digests equal, the redeal applied, the control's digest moved — and at least one row where the redeal reached the
copy and one where the control moved the digest (the row rule alone excuses a row with too few cards to move or none
to swap, so it would pass with neither ever happening; added on the second review, not yet run), the `--only` leg's forced retest (`same`, 5 / 5, one
signature a side) and the `--only-perturb` leg (`nondeterministic`, one warning, exit 0). The evidence is
`docs/evidence/cube-lab.md` §17.

**Residuals.**

- **A partial leak on a non-deterministic branch is caught rarely** (point 4). None is known; the warnings name every
  such check, and the night cap turns three over a night into a problem.
- **The digest lists ids, not each card's state** (counters, tapped, attachments). A redeal moves only cards in
  hidden zones, which the ids hold; `forkProblems` holds the rest of the position, D451's way. What the before/after
  pair does not hold is a leak through state outside the zones (an AI's memory of a card, a card's remembered objects)
  that also only shifts odds.
- **J203's own row stays as it was written** (`leakSame: false`, no new keys) and its spine's `atlas.json` keeps its
  problem: the night is not re-read. The job's summary already says why it is not a leak.
- **The retest's real-game coverage is the self-test's two forced legs**: a check that moves on its own has run the
  loop only in the 58-replay diagnosis's instrumented copy; the first night with one is its first unforced run, and
  its worker log names it (`[atlas] <key>: the no-leak check's first redealt replay moved; retest …`).
- **The job verdicts**: a night job's own sum of `checks.leaks` (J186–J203's) sees neither the faults nor the night
  cap; a job from D529 on calls `tools/cubelab.sh atlas-leaks` over every spine's `atlas.json` and checks `leaks == 0`
  and `leakFaults == 0` (points 5 and 7).
- **D528 point 6 names "a D529"** as the closing decision of the random-rollout track, if J204 closes it. This lane
  was handed D529 and `decisions.mjs next` printed it; D530 is the random-v6 lane's, so the closing draft takes D531
  or later, and PLAN.md's follow-up 47 says so.
