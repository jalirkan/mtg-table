## D401 — `play.sh --pause-lab`: an admission hold on the lab runner, taken for the life of a process, that never touches a running job

*Branch `c/draft-room`.* D400, the first number free at push: D398 and D399 went to the ladder (#85) and the bridge (#86) while this lane was open. Amends D337 (the runner's controls) and its schedule's "Justin first" rule.

**2026-10-06**

**Context.** People playing on the PC — a draft with a friend (D400), a game
against Forge — want the machine's spare cores, and the owner wants one
command for that. The runner already has three controls, and none of them fits:

- `pause` holds every running job's pool. Games in flight finish and no new game
  starts, so the running job stalls.
- `stop` TERMs the job.
- The automatic "Justin is at the table" rule watches only for a connection to
  the bridge port, so it does not see a draft. It also holds the running heavy
  job's games.

None of these is "start nothing new, leave what runs alone". A hand-made `pause`
followed by `resume` also has a trap: the `resume` lifts a pause someone else
made.

**Decision.**

- **A hold is a file per holder:** `<state>/holds/<pid>.json` holds `{pid, by,
  since}`, written atomically. While any hold's pid is alive, the schedule admits
  no job, heavy or light. It reports the jobs as blocked with the existing
  `playing` code (the reason names the holder), which the public copy already
  shows as the neutral `held`. Nothing else reads holds: not `holdReason` for a
  running job's steps, not the pool control file, and not the backoff. A running
  job keeps its step, its workers and its pace.
- **A hold whose pid is gone holds nothing,** and the next read removes it. The
  same goes for a torn file. A `play.sh` killed with -9, or a reboot, can never
  park the lab.
- **`tools/runner.sh hold [--pid N] [--by S]` and `release [--pid N]`** take and
  give back a hold. The default pid is the calling shell, so a hand-typed `hold`
  lasts as long as that terminal. `status` prints `HELD: …`. `release` touches only
  its own pid's file, so it never lifts another holder's hold or a `pause`.
- **`scripts/play.sh --pause-lab`** runs `hold --pid $$` before the build and
  `release` in its `stop()` (Ctrl-C, SIGTERM, a normal end). If the hold cannot be
  taken, `play.sh` says so and carries on: playing never waits on the lab.
- **The installed runner reads holds only from this commit on.** Until
  `tools/runner.sh install` updates `~/code/lab/runner`, a hold is a file nobody
  reads. `hold` checks whether the installed runner has `tools/runner/holds.ts` and
  prints a note when it does not.

**Rejected.**

- *`play.sh` running `pause` and `resume`.* That holds the running job's pool,
  which this lane must not do. It also lifts a hand-made pause on exit.
- *One shared flag file.* Two `play.sh` runs would release each other's hold, and
  a crash would leave the flag behind.
- *A new public status code.* The public copy already has `held`, and a new word
  would also need a ForgeCoach change.

**Measured.** `web/test/lab-runner.test.ts` covers the schedule with and without
a hold (nothing admitted while held, and a running job neither blocked nor
stopped). It also covers live, dead and torn hold files, two holders where one
releases, and the CLI's `hold`, `status` and `release` against a state folder
while a hand-made `paused` stays in place (99 tests).
`tools/match-launcher-selftest.mjs` runs the real `play.sh --pause-lab` against
its fake engine and a test state folder. The hold exists while it runs, holds
`play.sh`'s pid, and is gone after SIGTERM, with the hand-made pause left in place.
