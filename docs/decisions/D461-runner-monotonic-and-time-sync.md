## D461 — The lab runner decides durations on the monotonic clock, and its unit waits for NTP before it starts

*Branch `pc/runner-time-sync`. `node tools/decisions.mjs next` gave D461 on 2026-10-22.*

Answers **D459**'s follow-up (*Not changed, and a follow-up*: the runner's step timeout), and touches
**D337** (the runner and its unit), **D391** (the prepare retry and the git probe after a start) and
the restart reason PR #172 added.

**2026-10-22**

**Context.** Justin's PC dual-boots, and Windows wrote local time to the RTC, so Linux booted with the
wall clock 4 h behind until NTP stepped it right a minute or two later. Twice this week the lab runner
measured a duration across that step: J143 "ran 9 h" after 5 h of real time, and the git probe after
a start logged "the remote still does not answer 543 min after the start". J148's cube-lab units were
declared hung for the same reason (D459, which moved `tools/cubelab`'s watchdog to `performance.now()`).
Every elapsed-time check in `tools/runner` read `Sys.now()`, which is `Date.now()`. A step forward
fires a timeout or closes a retry window early. A step back holds a fetch, a publish, a backoff
cooldown or the pool's control file for hours. Justin has enabled `systemd-time-wait-sync.service` and
is fixing Windows' RTC convention, and the runner should not depend on either.

**Decision.**

1. **Every elapsed-time decision in the runner reads `Sys.mono()`**: CLOCK_MONOTONIC in milliseconds
   (`process.hrtime.bigint()`, which is libuv's `CLOCK_MONOTONIC` on Linux; `tools/runner/clock.ts`
   `monoMs`). NTP and an RTC fix never step it. It counts from the boot, so a stamp means the same thing
   in every process of one boot. The decisions moved onto it:
   - a step's `timeout:`, which is (1a) below;
   - D391's prepare-retry window and next try (`prepareRetry.sinceMono` / `nextAtMono`, and
     `holdReason`);
   - D391's git probe after a start (`startedMono`, `gitCheckedAt`), its "N min after the start" line
     included;
   - the memory-stop settle (`lastMemoryStop`, `MEMORY_STOP_SETTLE_MS`);
   - the pressure backoff's cooldowns (`decide`'s `at`, and so `BackoffState.lastDrop` / `lastRaise`)
     and the swap-in rate (`HostSample.at` is now monotonic);
   - the metrics/abort cadence (`metricsAt`);
   - the loop's own cadences: the fetch, the publish and its backoff, and the public copy and its
     backoff (`Runner.clock`). `runner.json` keeps their wall times for people and for the next start;
   - the pool's control-file cache (`control.ts` `controlReader`, `performance.now()`): on `Date.now()`
     a clock stepped back would have kept the runner's pause and worker cap from reaching a running
     cube lab or ai-ladder pool for 4 h.

   Wall times stay for what people read: STATUS (`started`, `finished`, `blocks_done`, `restart_reason`,
   the pressure events), status.json (`elapsed`, the rates and ETAs, `updated`), the logs, `p.started`,
   and the ledger's `since`. A step of the wall clock can make one of those numbers wrong, but none of
   them can stop, fail or hold a job. That includes the live rates and ETAs (`progress`, `liveHist`, two
   hours of wall-clock samples). The other `Date.now()` uses under `tools/runner` are timestamps too:
   `cli.ts`'s `status` age, the pause flag's time and a stop request's file name; `holds.ts`'s `since`;
   `restart.ts`'s start and exit times; and `dryrun.ts`'s reported seconds, where `spawnSync`'s own
   timeout is libuv's and monotonic. `restart.ts` judges `install`'s note fresh by its mtime, which is
   wall time by nature. At worst that drops or keeps a sentence in the restart line.

1a. **A step's elapsed time is counted only while a runner is alive, and saved; it is never derived
   from a start stamp.** The cloud's condition for the next atlas job: "elapsed counted only while the
   runner process is alive — persist elapsed-so-far, not a wall-clock start, so a reboot or clock jump
   can't fail a step; a 16 h job must not depend on nobody rebooting." `JobRun.stepElapsedMs` is set to
   0 when a step's unit starts. On every tick that sees the unit live (`monitor`, every 10 s),
   `Runner.accrue` adds the monotonic time since this process last looked, and the run is saved to
   `var/runner/jobs/<id>/run.json` on the same tick. The step timeout compares `stepElapsedMs` with
   `timeout:`. The mark accrue measures from (`elapsedMark`) lives in memory only, so the first look
   after a runner start adds nothing. A restart, a reboot or a wall-clock step therefore resumes the
   count where the last save left it. The runner's own downtime is not counted, and neither is the part
   of a tick it died in (at most 10 s). That is the intended trade: a step can outlive its `timeout:`
   by however long no runner watched it, and no event outside the step can fail it. `unitStartedAt`
   stays a wall time for STATUS, the logs and `journalctl --since`. A `run.json` from before D461 has
   no elapsed on record. Its step counts from its first load by this code, and the runner logs that
   it does: the live J149 is in that case, and its timeout window restarts at the upgrade.

2. **A monotonic stamp in `run.json` carries its boot** (`JobRun.monoBoot`). When a runner loads a
   run from another boot, or from before D461 (no `monoBoot`: its `metricsAt` and backoff stamps are
   wall-clock), it carries each stamp over once by the wall time since (`Runner.carryClocks`,
   `monoFromWall`). This covers the metrics cadence, the backoff's cooldowns and the prepare-retry
   window; the step's elapsed time needs no carrying (1a). A past stamp never lands in the future: a
   clock now behind it makes it "just now". A pending retry is at most its longest delay ahead. Within
   one boot (a runner restart, `install`) the stamps are kept as they are.

3. **`retry_after:` stays a wall time in STATUS, read back defensively** (`schedule.ts`,
   `retryHolds`). It holds a job back only while it is in the future by at most what the runner writes
   (`MEMORY_RETRY_MS`, 15 minutes, plus a minute). A `retry_after` that is unparseable, past or further
   ahead is due. Further ahead means the clock went backwards since it was written: a reboot with the
   RTC 4 h behind would otherwise have held the job 4 h 15 min.

4. **The user unit waits for a synchronized clock before the daemon starts.** `forgecoach-runner.service`
   gets `ExecStartPre=…/tools/runner.sh wait-clock <the daemon's options> --max-wait-s 600`, which
   polls `timedatectl show -p NTPSynchronized --value` every 2 s until `yes`. It stops after 600 s, or
   after 30 s of no answer (no timedated), and always exits 0: a clock that never syncs is reported, not
   fatal, since (1) already makes the runner safe on it. `TimeoutStartSec=660` covers the wait. The unit
   also says `After=time-sync.target`, but **a user manager cannot order after a system target**. It sees
   only its own units, so the line is inert there, and it is kept, commented, for a system-level
   install. The `ExecStartPre` wait is the mechanism that holds the start. Justin's system-level
   `systemd-time-wait-sync.service` orders system units, not this one. While the wait runs the unit is
   `activating`, so a `systemctl --user restart` on an unsynced clock blocks for up to 10 minutes.

5. **The daemon's start line says what the clock was.** `wait-clock` writes
   `var/runner/clock-wait.json`: the last answer, the seconds waited, why it ended, systemd's
   `INVOCATION_ID` (shared by `ExecStartPre` and `ExecStart` of one start), the boot id and a monotonic
   stamp. The daemon reads this start's record, matched by invocation id, or else by the same boot
   within 15 minutes. It asks `timedatectl` once more, and appends `clockText` to the restart-reason
   line from #172. Examples: `…; clock: NTP synchronized after a 74-s wait; synchronized now; elapsed
   times are monotonic (D461)`, or `clock synchronized, no wait recorded (not started by the unit's
   ExecStartPre)`. That line goes to the journal (`runner: start: …`) and, as `restart_reason:`, into
   every running job's STATUS.

**Not covered.** CLOCK_MONOTONIC does not advance during suspend. A step's timeout therefore excludes
time the PC was asleep, which is right: the step did not run then. The PC does not suspend while the
lab runs. A reboot kills every step's transient unit. A step that is run again after a reboot (a
resume or a restart, D365) starts a new count. A unit that somehow survived would be adopted with its
saved count (1a).

**Tests.** `web/test/lab-runner.test.ts`'s `FakeSys` gets a monotonic clock (`t`, which every existing
test moves) and a wall clock that can be stepped alone (`wallSkew`). The new tests cover:
- the wall clock stepped +4 h and then −8 h, with a 1-h step timeout that does not fire, until an hour
  of monotonic time has passed and it does;
- the cloud's case (1a): a 3-h-timeout step runs 2 h, saved at the tick cadence. The daemon dies,
  stays down 20 min while the wall clock steps 4 h, and the new daemon shows 2 h. Not 2 h 20 min from
  the start stamp, and not 6 h 20 min from the wall clock. Its first tick adds nothing and the next
  adds 10 s. Then a reboot: another boot id, CLOCK_MONOTONIC near 0 again, the RTC 4 h behind. Still
  2 h 10 s, still counting, and the timeout fires on the counted 3 h;
- a `run.json` from before D461 counts from its first load. A 20-h wall-clock age does not stop it,
  and its other stamps are carried over;
- the prepare-retry window survives a +4 h step and the job finishes;
- the git probe does not report "240 min after the start";
- the memory-stop settle is not held back by a clock stepped back;
- `retry_after`: past is due, 10 and 15 minutes ahead hold, 4 h 10 min ahead (the clock went backwards)
  is due, and an unparseable value is due.

With `monitor`'s timeout and `gitReachable` put back on `Sys.now()` (before 1a), three of these
failed.
`web/test/lab-runner-clock.test.ts` covers the rest:
- `monoFromWall`, `retryHolds`;
- the wait: synced at once, after 6 s, the cap, timedated absent;
- `clock-wait.json`'s matching, `clockText` and the restart line's new tail;
- the unit's `ExecStartPre`, `TimeoutStartSec` and `After=`;
- the control reader under a `Date.now()` stepped back 4 h;
- `realSys().mono()` and `host().at` against `process.hrtime`.

**Applying it.** The live runner is `~/code/lab/runner`, a checkout of this repo that `install` makes.
After the merge the PC runs `tools/runner.sh install`, which rewrites the unit, runs `daemon-reload`
and restarts the service, or it updates the checkout and applies the unit change by hand. Either way,
a running job's unit is adopted, not stopped (D337).
