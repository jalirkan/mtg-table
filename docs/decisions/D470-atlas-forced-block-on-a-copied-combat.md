## D470 — A forced block is given at the fork's own combat: the copied combat's blocks come off before the seat is asked, and an option the copy cannot give is "unavailable", never an error or a later block (amends D451, D466)

*Branch `pc/atlas-no-band`. `node tools/decisions.mjs next` gave D470. Amends **D451** (how a branch forces its
option) and **D466** point 2 (what counts as a branch error). Touches the search's block candidate (**D312**)
through the install it shares with the atlas.*

**2026-10-23**

**Context.** In J158's spine `b-ff5-461` (fair-fight-900000005, seed 461), option 0 of two block decisions
errored in a large share of its branches. Every row said `turns: 0, steps: 0`, but that is only how an
errored row is written; the errors came later in the game.
- **d10, option 0, `block:35>78`** (Kitesail Freebooter blocks Ledger Shredder): 47 of 240 branches errored
  (random 44 of 200, Forge 3 of 40), each with `NullPointerException: No band for attacker Ledger Shredder (78)`.
- **d14, option 0, `block:21>71`** (Gray Merchant of Asphodel blocks Skyclave Apparition): 164 of 240 errored
  (random 126 of 200, Forge 38 of 40).

The same NPE appeared on J157's and J150's spine 460: 23 branch games at its d10, in 8 random branches,
from options 0, 2 and 3 (D466 counted them and left them under its bar).

**What it was.** Replayed alone (a one-unit job for d10, random, branch 2, on this branch with a debug print
of the copy's combat at each step, so `Atlas.java`'s line is that build's), the first frames of the stack were:

```
java.lang.NullPointerException: No band for attacker Ledger Shredder (78)
  at forge.game.combat.Combat.getBandOfAttackerNotNull(Combat.java:325)
  at forge.game.combat.Combat.addBlocker(Combat.java:375)
  at mtgtable.ai.RolloutController$Forced.blockers(RolloutController.java:126)
  at mtgtable.ai.AtlasController.declareBlockers(AtlasController.java:88)
  at forge.game.phase.PhaseHandler.declareBlockersTurnBasedAction(PhaseHandler.java:671)
  at forge.game.phase.PhaseHandler.onPhaseBegin(PhaseHandler.java:317)
  at forge.game.phase.PhaseHandler.mainLoopStep(PhaseHandler.java:1140)
  at mtgtable.ai.Atlas.play(Atlas.java:691)
```

It was thrown at **turn 15**, step 76, two turns after the fork. The fork's own turn 13 had gone by without
the seat ever being asked to block. The chain, with line numbers at the `forge-2.0.14` tag:

1. **The decision is taken with Forge's block already on the combat.** `PolicyControllerAi.declareBlockers`
   lets Forge's AI place its blocks first. `SearchPolicy.chooseBlock` lists the options with Forge's as
   option 0, and puts Forge's blocks back on the combat (`setBlock(combat, ai, forge)`) before the atlas
   hook branches. The fork's `GameCopier` copies that combat, blocks included (`GameCopier.java:170-171`).
2. **The install rewinds, and Forge does not ask again.** `BlockCand.install` sets the copy back to
   declare attackers, so that the next step re-enters declare blockers. That step's turn-based action asks
   a defender only if `CombatUtil.canBlock(defender, combat)` (`PhaseHandler.java:663-664`). That is true
   only when some creature can still block some attacker (`CombatUtil.java:876-891`), and a creature that
   is already blocking cannot block again (`canBlockMoreCreatures`, `:428`, `:496-502`). When Forge's block
   had used every creature the seat could block with, the answer was false and the seat was not asked. At
   d10 that creature was Freebooter alone, and at d14 Gray Merchant alone.
3. **So every option played Forge's block,** "block none" included, and the forced answer stayed armed.
   `Forced.blockers` gives its answer at the first `declareBlockers` it sees, so it gave it at the seat's
   next combat. If that combat's attackers did not include the old attacker, `Combat.addBlocker` threw
   (`Combat.java:375` → `getBandOfAttackerNotNull`, `:322-327`). That is the NPE. If they did include it,
   the turn-13 block was placed silently in a later combat (with a blocker that may have died), or, for
   "block none", the seat's later blocks were cleared.

The replay shows it. At turn 13, steps 0–9, the copy's combat holds Freebooter on Shredder and
`canBlock(defender)` is false, in both options. The J158 row for "block none" at branch 2 (17 turns,
148 steps, lost) is exactly the game that option 0 plays once fixed (17 turns, 148 steps, lost).

The hypotheses in the lane's brief, checked:
- **(a) The order of the step replay: yes, in this form.** It was not the block applied before or after
  the attacker was declared, but the copied block stopping Forge from asking at all.
- **(b) A different attack in the continuation: only the second half.** The attacker at turn 15 was
  missing because this was the wrong combat.
- **(c) A changed id or a stand-in: no.** `standIns: 1` is on every row of the spine, the good ones
  included. It is one sideboard card mapped to a throwaway card (`LenientGameCopier`, D311).

**How far it reaches.** One signature is easy to read in the frame-free rows. Where the seat was never asked,
every option of a branch plays the same game, so the rows of one branch index have identical `turns`,
`steps` and `result` across all options. Counted over every block decision in `lab-j150`, `lab-j157` and
`lab-j158`, Forge's continuation (random's in brackets):

| spine | decision | options | identical across options |
|---|---|---|---|
| J158 461 | d10 | 2 | 37 of 40 (156 of 200), the rest the NPE |
| J158 461 | d14 | 2 | 2 of 40 (74 of 200), the rest the NPE |
| J158 461 | d30 | 4 | 40 of 40 (200 of 200) |
| J157/J150 460 | d10 | 4 | 40 of 40 (192 of 200, 8 the NPE) |
| J150 455 | d33 | 4 | 40 of 40 (200 of 200) |
| J150 457 | d16 | 2 | 40 of 40 (200 of 200) |
| J150 452 / 453 | d25 | 4 / 3 | 37 / 35 of 40 (197 / 100 of 200) |
| J157/J150 458 | d11 | 3 | 21 of 40 (21 of 200); option 0 there is `block:none` |
| J150 455 d29, 457 d9 | — | 4 / 2 | 0 of 40 (0 and 1 of 200) |

A decision whose option 0 is a block, and where that block used every creature that could block, has a map
that measures nothing: every option there played option 0. **The regret maps of those decisions in J150,
J157 and J158 are void,** and so is every agreement number that includes them. Decisions where Forge chose
no block, or left a creature free that could still block, were asked as they should be, and the rows show
it (457 d9, 455 d29).

**Decision.**

1. **`BlockCand.install` takes the seat's blocks off the copied combat** before it rewinds to declare
   attackers (`combat.undoBlockingAssignment` for each blocker the seat controls). The combat is then as it
   was when Forge asked the seat in the real game: its attackers declared, none of this seat's blocks
   placed. The turn-based action asks the seat, and the forced answer is given at the fork's own combat. The
   install is shared, so this fixes the search's block candidates too (point 4).
2. **A forced combat answer is given at the fork's combat or not at all.** `RolloutController.Forced`
   records the turn it was armed on.
   - `blockers` and `attackers` throw **`RolloutController.OptionUnavailable`** when the seat is first asked
     on another turn.
   - `blockers` also throws it, before touching the combat, when a forced attacker has no band in this
     combat (`Combat.getBandOfAttacker` is null, the case `addBlocker` turns into Forge's NPE) or a forced
     blocker is not on the battlefield.
   - `Forced.expired` names the answer the copy went past: the fork's declare-blockers step (or
     declare-attackers step) is over, or its turn is, and the seat was never asked. `Atlas.play` checks it
     after every step and throws the same exception.

   No stale answer is ever given in a later combat.
3. **An unavailable option is its own outcome, not an error.** `Atlas.play` catches `OptionUnavailable`,
   found through the cause chain as D467's timeout is. The branch's row carries `unavailable: "<why>"`,
   with `error: null`, no `engineError`, no result, and its rows marked not played. Its frame logs end with
   the engine-error notice and an `over`, as any branch ended mid-step does. `atlas.ts` treats it like this:
   - it leaves such a branch out of the option's value, as it leaves out an error (the paired matrix drops
     the branch index);
   - it counts it in a new **`checks.optionUnavailable`**, by reason (ids as `#`) and by option, beside
     D466's `branchErrors`, which no longer sees it;
   - `phaseB.branchUnavailable` is the total, and `atlas.md` has a section for it;
   - an option unavailable in more than `--branch-error-max` of its branches is a problem, at D466's bar.

   After point 1 an unavailable option should be rare. The only routes left are a copy that differs from
   the real game at the fork, or something between the fork and the declaration step that removes the
   attacker. The counter is there so such a case is seen, not averaged in. The no-leak check is skipped
   for an unavailable branch, as for an engine error.
4. **Comparability (D458 point 3, D466's last bullet).**
   - **The atlas: every block decision of the kind above changes.** Maps from before this decision are
     not comparable at those decisions; the table above names them, and the rest are unchanged.
   - **The search: block search changes too** (`what=` containing `b`, `cfg.blocks`). `chooseBlock` also
     puts Forge's blocks back on the combat before its rollouts, so where Forge's block used every possible
     blocker, each block candidate was scored as Forge's block, and the search could never prefer another.
     Search-v2 results with block search on, from before and after this change, are two engines and are
     not pooled. Split them by the experiment log's git sha, as D466 asks for #184.
   - **The coach grader is unaffected.** It clears the viewer's blocks after testing each one
     (`Grader.legalBlock`), so its copies were already asked.
   - **Attacks are unaffected.** `AttackCand.install` rewinds to the beginning of combat, which makes a
     fresh `Combat` (`PhaseHandler.java:300`). The turn guard and `expired` cover attacks only so that the
     rule is the same for both.

**What it rests on.** There is no new thread and no hop onto the game thread (hard rule 3). The exception is
thrown on the game thread, inside a copy that `Atlas.play` already discards on any `RuntimeException`
(D465), and the search's playout rethrows it as it rethrew the NPE. Every Forge call used is in the
pinned jar (javap: `Card.isInPlay`, `Combat.getBandOfAttacker`, `Combat.undoBlockingAssignment`).

**Rejected.**
- **Catch the NPE.** It is the symptom. "Block none" would still have played Forge's block, and a stale
  block would still have been placed in later combats without any error.
- **Fall back to the seat's own choice when the forced answer cannot be given, and mark the branch.** The
  branch would then be a game of another option, filed under this one. Leaving it out and counting it
  keeps the option's value its own.
- **Call `declareBlockers` on the seat's controller directly after the install.** That would skip Forge's
  turn-based action and its block costs and requirements (`PhaseHandler.java:681-720`). Taking the copied
  blocks off lets Forge run the step as it would.
- **Count an unavailable branch as a branch error** (D466 point 2). An error says the tool or the engine
  failed. This is a position where the option does not exist, and the two need separate counts to be read.

**Measured.**
- **Replays on this branch, one unit each, one worker beside J158.**
  - d10 random branch 2: option 0 ran to 17 turns and 148 steps with no error. Its frame log shows
    Freebooter blocking Shredder and seat A going from 8 life to 6. Option 1 (block none) now takes 7 damage
    at turn 13 (8 to 1) and loses at turn 15. In J158 it played option 0's game.
  - d14 Forge, branches 0–2: no error in 6 games. Block none loses in 7 steps (turn 15) in each. J158 had
    it at 67–86 steps, and two of the three option-0 branches threw the NPE.
- **`tools/ai-bench.sh --selftest`: 102 checks, 0 failures.** It adds 6 engine checks in
  `forcedBlockScenarios`, on Hill Giant blocking Grizzly Bears with Forge's block left on the real combat:
  - the search's playout plays "block none" as no block (seat at 18 life, Bears alive) and the block as the
    block (20 life, Bears dead);
  - the real game's combat is untouched;
  - an atlas branch of the block plays (the control);
  - a forced block on Wall of Wood, which is not attacking, is `unavailable` and not an error;
  - a seat never asked (its Giant tapped) is `unavailable` at turn 5, with no block given later.

  With point 1 taken out, three of the six fail: "block none" plays the block, and the other two come back
  "never asked".
- **`bridge/build.sh`: OK** (the lint and its self-test, the eight self-tests).
- **`web/test/cubelab-atlas.test.ts`: 21 of 21 pass, one of them new** (unavailable rows left out of the
  map, counted apart from errors, a problem past the bar, shown in atlas.md). The cube lab's atlas, record,
  heap and watchdog tests: 59 of 59. `tsc --noEmit` is clean.
- **`tools/cubelab.sh atlas-selftest --jobs 1`: OK** (16 forks, 8 no-leak checks, 38 frame logs, 538 rows;
  the tax pair's G5 refused 2 and left out 2), in 3 min 13 s.
- **Not run:** the full gate, and J158's spine 461. The lab is running J158 on 6 workers.
