## D464 — `elapsed_s` is the run's counted monotonic time, and the swap-in baseline carries its boot

*Branch `pc/runner-elapsed-s`. `node tools/decisions.mjs next` gave D463 on 2026-10-22, which PR #180
(`pc/review-followups-oct22`) holds, so this is D464.*

Amends **D461** (the lab runner on the monotonic clock). These are the two follow-ups from the cloud's
review of PR #179.

**2026-10-22**

**Context.** D461 moved every duration the runner itself decides on to CLOCK_MONOTONIC, and it made a
step's timeout count only the time a runner was alive, saved in `run.json`. Two things were left on the
old footing:

- **MEDIUM.** `runnerFacts` still computed `elapsed_s` as `sys.now() - r.startedAt`, a wall-clock
  difference. That name is in the scope of every job's `abort:` and `check:` expressions, so a 4-h
  step of the wall clock would still fire `abort: elapsed_s > …`. The PC's dual-boot RTC did exactly
  that kind of step twice in the week D461 answers.
- **LOW.** `p.lastHost`, the saved host sample, carried no boot id. Since D461 its `at` is monotonic,
  and `pswpin` is the kernel's count since boot. The first swap-in rate after a reboot therefore
  compared against the previous boot's sample, which can produce a burst of swap-in that never
  happened. That rate feeds the pressure backoff.

**Decision.**

1. **`elapsed_s` is `JobRun.runElapsedMs`**, counted the way D461 counts a step. On every tick that
   advances the run, `Runner.accrueRun` adds the monotonic time since this process last advanced it,
   and the run is saved on the same tick. The mark it measures from lives in memory only, so a runner
   restart or a reboot resumes from the saved count. The downtime is not counted, and a wall-clock
   step never moves it. A new run, and a retry, which is a new run, starts at 0 when it begins.

   The name stays in the expressions' scope. Job files keep working, and what `elapsed_s > 7200`
   means only changes when the clock jumps or the runner is down. A `run.json` from before D464 gets
   the wall time since its `startedAt` once, on load, then counts. D461's `ExecStartPre` means that
   load happens on a synced clock.

   STATUS's `started` and status.json's `elapsed` stay wall-clock. They are read by people and decide
   nothing (`publicSignature` already ignores `elapsed`).

2. **The saved host sample carries its boot** (`Persist.lastHostBoot`). `sampleHost` uses the saved
   sample as the baseline for the first rate only when it is from this boot, which covers a runner
   restart. A sample from another boot, or a `runner.json` from before D464 with no boot id, is no
   baseline: the rate is 0 until two samples of this boot exist.

**Tests** (`web/test/lab-runner.test.ts`, the D461 section's `FakeSys`, which gains a settable `pswpin`):

- `abort: elapsed_s > 7200` at run1. 30 minutes pass, then a +4 h wall step and three metric
  evaluations: `elapsed_s` is 33 min and nothing is stopped. The daemon is then down for 20 minutes
  while the clock steps −8 h. The new daemon resumes from the saved count, and its first tick adds
  nothing. The abort fires once the counted time passes 2 h.
- A `run.json` from before D464 gets 3 h from its wall-clock start, and from then on counts monotonic
  ticks only.
- The swap-in rate: 500/s within a runner, and a restart in the same boot keeps the baseline (100/s).
  A reboot (a new boot id, a higher pswpin and a later monotonic clock) gives 0, not a phantom rate,
  and then 200/s from two samples of the new boot. A `runner.json` with no `lastHostBoot` also gives
  0.

With `elapsed_s` put back on the wall clock and `lastHost` used whatever its boot, all three tests fail.
