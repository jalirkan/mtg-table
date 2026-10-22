## D465 — The move atlas survives an OutOfMemoryError: a branch's ledger lets go of its game, a branch that throws ends alone, a worker out of heap retires and its unit resumes per branch; and the Forge seat's refused plays are capped (amends D451)

*Branch `pc/atlas-oom-class`. `node tools/decisions.mjs next` gave D463; open PRs hold D463 (#180) and
D464 (#182), so this is D465. Amends **D451** point 2 (the continuations' policies), point 6 (the checks)
and its resumability.*

**2026-10-22**

**Context.** J148 (`-Xmx4096m`) lost two units to a worker `OutOfMemoryError`. J151, at the atlas's new
2048m default (`ATLAS_WORKER_XMX`), was aborted two hours in on `unit_errors > 30`. Its phase B logs
(`lab-j150.j151-partial-1247/b-ff5-452/phaseB/logs/`) show the following.

- **The units died at a branch count, not at a card.**
  - The 150-branch units stopped at 63–76 branches, and the 100-branch units at 65–73. The 50-branch
    units finished.
  - The `OutOfMemoryError`s are thrown at whatever allocates next. That can be a regex in
    `Card.getAbilityText`, `CardState.getStaticAbilities`, `KeywordCollection` or Forge's AI eval
    thread (`AiController.lambda$chooseSpellAbilityToPlayFromList$9`, the jar's line 1675). This is a
    heap that fills up, not one runaway loop.
- **The cause is a leak in our code.** `Atlas.Hook.branches` keeps every branch until its unit ends.
  Each branch with frames keeps its `GameLedger`, and the ledger held its `Game` and players, so each
  branch kept its whole played-out copy alive.
  - Measured with the atlas self-test (`--jobs 1`; four units of four branches each, the copies
    weakly referenced, one `System.gc()` at each unit's end): **4 of 4 copies still reachable in every
    unit before this decision; 0 or 1 after it.**
- **One OOM costs the whole unit, and often the next one too.**
  - `Atlas.play` caught only `RuntimeException`. An `Error` escaped the branch, the replay game died,
    and the unit reported the branches done so far as unfinished.
  - The worker lived on with a full heap. The next unit then failed at once, with 0 branches after
    about 0.5 s (d2-random-0, d2-forge-0).
- **The Forge seat's refusal loop does not show up in J151.**
  - J151's Forge units have no "AI failed to play" lines. Their OOMs came after the heap was already
    full.
  - Every Spellbinder refusal is a random continuation's, at most one per branch: G5 holds.
  - Forge's own AI can still loop. `AiController.getSpellAbilityToPlay` clears the marks it set
    aside the time before (`forge-ai/.../AiController.java:1513-1520`) and sets aside only the plays
    marked now (`:1570-1572`).
  - So two plays a tax makes unpayable are chosen in turn: X, Y, X, Y. Each is refused by
    `ComputerUtilMana.payManaCost` (`ComputerUtilMana.java:811-812`, "Didn't find what to pay for")
    or `ComputerUtil.handlePlayingSpellAbility` (`ComputerUtil.java:137-142`, "AI failed to play").
    The priority goes back to the seat each time.
  - The only bound on this is `PhaseHandler.mainLoopStep`'s 999 iterations
    (`forge-game/.../PhaseHandler.java:1056-1102`), and each iteration runs an AI evaluation and
    `game.copyLastState()`.
  - These lines are from the source checkout `~/code/forge-src` (`579d0a84c`). The pinned 2.0.14 jar
    has the same methods with lines shifted by about 20 (`javap -l`: `future.get` at 1696, the eval
    lambda's `canPlayAndPayFor` at 1675).

**Decision.**

1. **A ledger lets go of its game** (`GameLedger.detach()`).
   - `Atlas.play` detaches every branch's ledger in its `finally`. The turns the ledger read are
     kept, `write` is unchanged, and `snapshot` after the detach reads nothing.
   - A unit's held memory is now its numbers, not its games.
   - Each unit's game row carries `atlas.copiesRetained`, the copies still reachable after one GC at
     the unit's end. `units.jsonl` carries it too, and `atlas.json` carries
     `checks.copiesRetainedMax`.
   - `atlas-selftest` requires at most 1. A Forge AI thread that outlived its timeout can still hold
     the last copy, because `Thread.stop` is unsupported on Java 21.
2. **A branch that throws ends alone.**
   - `Atlas.play` catches `Error` as well as `RuntimeException` at the branch's boundary. That covers
     the recorders' close too.
   - The branch's row carries the error and **`engineError: true`**. It is never dropped.
   - The copy and the ledger are let go, and the unit goes on with its next branch. A branch that
     threw gets no leak check.
   - After an `OutOfMemoryError` the hook runs one `System.gc()` and logs the heap in use:
     `[atlas] <key>: OutOfMemoryError ... heap in use after one GC: N MB of M MB`.
   - `atlas.json`'s `phaseB.branchEngineErrors` counts these branches, and `atlas.md` names them.
3. **A worker out of heap retires.**
   - Two `OutOfMemoryError`s in a row end the unit's branching (`Atlas.OOM_RETIRE`). A branch that
     ends without one resets the count.
   - So does one in the unit's replay game itself. A single game needs little heap, so that one OOM
     means the heap is spent.
   - The replay is then ended as a draw.
   - The match line carries `retire` (why), and the JVM exits **4** (`CubeLab.RETIRED`; 3 stays "a
     game thread is stuck").
   - The pool (`engine.ts`) treats a retirement as neither a death nor a boot failure, and starts a
     fresh worker for the rest.
   - The pool now acts on `close` rather than `exit`, so every line a worker wrote has been read
     first.
4. **A unit resumes per branch.**
   - Each finished branch is streamed as it ends, as `CUBELAB {"type":"progress","id","branch"}` (the
     same object as the game row's). The atlas writes it to `branches.jsonl` at once, and the final
     match line's copy is not written again.
   - A unit left unfinished is played again at once on the pool's next worker, with `atlas.skip`
     listing every branch it already has a row for (`o<o>:b<i>`, `Atlas.skipKey` /
     `branchKey`). This covers a retirement, a dead worker, a hang and a replay that diverged.
   - The OOM branches count as recorded. They stay engine-error rows and are not replayed.
   - The second attempt always runs. A later one runs only if the attempt before it recorded a branch,
     and there are at most `UNIT_ATTEMPTS_MAX` = 4 attempts (`resumeUnit`). A unit that dies at the
     same place twice is given up.
   - `units.jsonl` gets **one line per unit, when it is done**, with `attempts`, `engineErrors`,
     `attemptErrors` and `copiesRetained`. A resumed attempt writes no `"ok":false` line, so the lab
     runner's `unit_errors` counts only units that never finished.
   - A rerun of the command resumes an unfinished unit the same way, from `branches.jsonl`. A unit
     whose every branch already has a row is closed without a game. Before this, a rerun replayed
     such a unit from branch 0 and wrote its rows twice.
5. **The Forge seat's pay cap** (`PayCap`, on `AtlasController`; protocol **M72**).
   - On a branch seat Forge pilots, a play the engine refused (Forge's `skip` mark set by this play)
     is counted per option token in G5's priority window (`Explorer.window`: the turn, the phase, the
     stack's size and top, the seat's lands).
   - Once a play has been refused **3** times in one window, Forge's next choice of it there is
     answered with a pass. That pass is `null`, the form Forge itself uses: `PhaseHandler` loops on an
     empty list.
   - The decision record says `why: "PAY_CAP"`, and the pass is counted as `forgePayCap`. The count
     goes in the seat's log as `decisions` summary `guardrails: {forgePayCap: n}` (M72), and
     `atlas.json`'s `checks.guardrails.forgePayCap` sums it over the Forge branches' logs.
   - A random seat never takes this path, because it has G5. The census, ladder and live seats do
     not either, because only `AtlasController` enables the cap.
   - **This changes the Forge map's policy only in the pathological case.** A play refused three
     times in a window where nothing has changed would be refused again. Forge's own loop would end
     the same way, by passing, only after its 999 iterations.
   - With no refusal loop, every answer is Forge's, so a Forge map from before this decision and one
     after it are the same policy. A nonzero `forgePayCap` marks an atlas where the two differ.

**Rejected.**
- **A larger heap.** J148 at 4096m lost units too. A leak of one game copy per branch fills any cap,
  and the lab runner sizes its workers from the declared cap.
- **Restart the worker after every unit.** That is a boot (about 10 s) per unit and hides the leak.
  The leak would still kill a long unit.
- **Retire on the first OOM.** One branch can run away on its own (an AI pay search, a huge board).
  A GC after it returns the heap, as the log line shows.
- **Retry the OOM branches on resume.** A deterministic runaway would OOM again on every attempt. Its
  row says engine error, and the count is in `atlas.json`.
- **Write a `units.jsonl` line per attempt.** The runner's `unit_errors` counts `"ok":false` lines.
  An attempt that a resume finishes is not a unit error.
- **Cap the Forge seat everywhere (census, live play).** Nothing outside the atlas showed the loop,
  and a policy change there would move ladder and census numbers.
- **Cap "consecutive" refusals only.** Forge alternates between two refused plays, so no play is
  ever refused twice in a row. A count per play per window catches the alternation.

**Measured.**
- `bridge/build.sh`: OK, lint and its self-test included. `DecisionSelfTest`: 144 checks (8 new). The
  X, Y, X, Y loop is planted as Forge runs it and ends in a pass after 3 refusals of each. The pass is
  counted, a play never refused is untouched, a land drop or a stack move is another window, and
  under the limit Forge's choice stands.
- `tools/cubelab.sh atlas-selftest --jobs 1`: OK. Copies held at a unit's end: 0 or 1 (4 of 4 with
  `detach` disabled, the negative control). `forgePayCap` is 0, because the self-test's decks hold no
  cost-raising card (D462 point 4).
- `web/test/cubelab-atlas-resume.test.ts` (new, a fake worker on PATH, the real pool and resume
  policy):
  - a worker that dies after streaming 3 of 8 branches is resumed with exactly those 3 skipped, and
    every branch is played once;
  - a worker that retires after two OOM branches is replaced, and the OOM rows stay as engine errors;
  - a unit that dies at the same place twice is given up after two attempts;
  - the resume policy's table.
- `web/test/cubelab-record.test.ts`: M72's positive (0 and 3) and its negative controls (a non-atlas
  log, a random branch, an unknown name, a non-integer, `null` / `[]` / `""`).
- `web/test/cubelab-atlas.test.ts`, "a decision's two maps": J153's pilot failed it once on
  `8fca7250`. The map is a pure function of its rows and seed (`rng(seed, stream)`, never
  `Math.random`). It gives regret 0.3583 against a bar of 0.25 and a lower bound of 0.229 against
  0.1, the same on 50 runs in a loop before and after this change. The test now asserts that a second
  call agrees exactly and pins those two values, and the failure message prints them. No source of
  nondeterminism was found in the code; if it fails again, the printed values will say whether the
  numbers moved.
- No full gate and no atlas run: J152 holds the PC. J152 runs `main` without this change. Whether the
  leak fix alone is enough at 2048m is the next atlas's to show: zero `branchEngineErrors`, and
  `copiesRetainedMax` ≤ 1.
