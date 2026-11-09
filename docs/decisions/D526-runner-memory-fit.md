## D526 — the lab runner starts a step that cannot get its full memory with as many workers as fit (at least two) and raises it toward its sized count as the memory frees; only under two does it wait (`memory-wait`, `degraded`), and the start is a `memory-fit` alert, information, never `degraded`

*Branch `pc/runner-memory-fit`, off main `ec9b77fb` (D525's merge). `node tools/decisions.mjs next` printed D526.
Amends D521 (its point 3, the actual-memory gate on every admission and step start, and its point 6, the alerts).
Runner code, its tests and its manual, and the coach helper's automatic review gate (`tools/auto-review.mjs`); no
bridge, wire or protocol change. A skeptic review of the first version changed eight things; they are folded in
below.*

**2026-11-09**

**Context.** J201 (D525's two 1,200-game ladder matches, `cores: 7`, `max_workers: 7`, `mem_per_worker_gb: 2`,
`alone: yes`) finished its command 1, match (a), at 08:50:56 (`blocks_done: run1 exit 0`), and its command 2 did not
start. Its STATUS, and the runner's journal at the same second:

> waits: memory: needs 21.4 GB for run2; 19.6 GB free (22.6 GB available, less 3 GB kept free); it starts when that fits

- **The machine sat idle.** A GPU painter outside the lab slice held about 6 GB of RAM. J201 runs alone, so nothing
  else could start either: the lab's 7 workers and the other 7 threads of the 14-thread budget did nothing from
  08:50:56 on (still waiting at 09:06, MemAvailable 23 GB, 20 GB free, when this was written). `status.json` said
  `degraded` with the `memory-wait` alert "J201 waits on memory held outside the lab slice (MemAvailable 22.6 GB,
  need 21.4 GB)". The owner's rule: an idle machine is the one failure he will not accept.
- **The need was all or nothing.** D521's gate compares the step's whole expected peak with the free memory: seven
  workers at the per-worker need, counted at most the installed heavy budget. J201's per-worker need was not the
  declared 2 GB but D521's measured floor: run1's largest worker JVM reached VmHWM **2.56 GB** over its 2 h 18 min
  (run.json `measured.workerPeakGb`; the STATUS's `peak_worker_rss_gb: 1.36` is the pilot's), × 1.4 = **3.59 GB a
  worker**, × 7 = 25.1 GB, capped at the installed 21.4. So run2 needed MemAvailable ≥ 24.4 GB to start at all, and
  19.6 GB — five workers' worth — counted for nothing.
- **The backoff had already run J201 under-sized beside the same painter.** During match (a), at PSI some avg10 ≤
  5.5% but swap-in bursts of 2,576–9,884 pages/s, it dropped run1 from 7 to 6 (08:16:49) and 5 (08:19:07), raised it
  to 6 (08:27:35), dropped it to 5 (08:36:26) and raised it to 6 (08:42:16) and 7 (08:47:21); a pilot had dropped
  from 3 to 2 at 06:32:12. A 5-wide start is what the backoff itself chose under that memory a few minutes before.

**Decision.**

1. **A step that cannot get its full budget starts with as many workers as fit** (`Runner.memoryFit`,
   `FIT_MIN_WORKERS` in `tools/runner/budget.ts`). When D521's check refuses a heavy `## Pilot` or `## Commands`
   step whose memory is per worker (no block `mem_gb:`) on the free memory — not on pressure — or the step's
   uncapped total (its workers × `perWorkerNeed`, which D521 counts at most the installed heavy budget) exceeds that
   free memory, the runner computes `floor(free / perWorkerNeed)`, where `free` is D521's (MemAvailable less the 3 GB reserve and less what the other
   running jobs reserved and have not touched) and `perWorkerNeed` is the number the budget already uses
   (`Runner.perWorkerGb`: the sized, declared or default per-worker peak as a floor, raised by the largest worker's
   VmHWM × 1.4 once a commands step has run 60 minutes; `holdingAt` now calls the same function). If that is at
   least **2** and fewer than the step's workers, the step starts with that many. A commands step whose tools read
   the control file (`control: yes`, or detected) starts its pool at its sized count with the control file's
   `maxWorkers` at the fit; a pilot, or a job that cannot be told, gets the fit as `{workers}` and `JOBS` for the
   whole step. The step's backoff count is the fit either way, so STATUS, `status.json`'s `running[].workers`, the
   `workers` metric and the pressure events say the workers that really run; a fit that cannot be raised stays
   there, and the next step gets back the workers a fit held down (less any pressure drop meanwhile). J201 at
   08:50:56: floor(19.6 / 3.59) = **5 of 7**, at once. Deciding on the uncapped total means no jump at the cap: a
   step whose capped need fits while its workers do not (J201's 25.1 GB against 24 GB free) is fitted, not started
   whole.
2. **Under two, it waits as D521 says**, with the `memory-wait` alert and `degraded` — but what it waits for is the
   two workers' worth (J201: 7.2 GB), and its STATUS says so: "memory: needs 7.2 GB for run2 (2 workers; all of them
   21.4 GB); …". Admission is the same rule (`schedule.ts`, `headerNeed`, `Holding.minGb`): a heavy job wider than
   two whose memory is per worker, with no pilot or commands block carrying its own `mem_gb:` (that step waits for
   all of it, so such a job waits for its whole need, and `needs.json` keeps the whole need for `budget --mem-gb`),
   is admitted when two workers' worth fits the free memory, not its whole reservation; a memory retry likewise, at the step it resumes at (`retryNeeds`). The whole need stays reserved
   inside the lab's budgets and carved out of the free memory for the jobs after it, as before: it grows into it.
   A block `mem_gb:` (a fit, a merge), a one-core step, a prepare and memory pressure over 5% wait as before.
3. **The backoff raises it toward its sized count as the memory frees, never past what fits** (`Runner.memFitCap`,
   `Sample.memCap` in `backoff.ts`). The step's backoff keeps `sized` at its full count, so D337's raise rule (12
   calm samples, 5 minutes between raises) applies to it; for a step started under-sized, a raise also needs the
   next worker to fit: MemAvailable less the reserve, the other jobs' untouched reserve and its own running
   workers' untouched need (their need less the unit's anon memory) must hold one more `perWorkerNeed`. When it
   reaches its sized count the fit is cleared. A pressure drop is unchanged. A runner restart keeps the fit
   (run.json).
4. **The start is information, not degradation: a new alert kind, `memory-fit`** — `{ at, id, kind: 'memory-fit',
   workers, workersMax, needGb (its need a worker), availGb (MemAvailable then), text }`, kept 24 hours as a stop or a
   retry is, one per job per run whatever its steps do. "J201 started with 5 of 7 workers at …, as many as fit (MemAvailable 22.6 GB, 3.59 GB a worker); raised
   toward 7 as memory frees." `state` stays `running`. The public copy rebuilds it from its fields like the others
   (two more numbers, `workers` and `workersMax`). The job's STATUS says it in its `workers:` line: "5 (5 of 7 fit:
   memory 22.6 GB available, 3.59 GB a worker; raised toward 7 as memory frees; sized 7: min(…))";
   `tools/runner.sh status` prints "5 of 7 worker(s)" and the alert; `tools/runner.sh budget` says the rule.
5. **The coach helper's automatic review stays off a fitted lab** (`tools/auto-review.mjs` `labGate`). D521 closed it
   only while the lab is `degraded`; a fit is `running` with cores free, and a review's JVMs would take the very
   memory the fit grows back into, and the 3 GB reserve. The gate is closed while a running job has a `memory-fit`
   alert and fewer `workers` than its `workersMax`; the why carries the alert. A job under-sized by a pressure drop
   alone, or raised back to its count, leaves the core rule as it was.

**This morning under D526.** At 08:50:56 run2 would have started with 5 workers (19.6 GB free, 3.59 GB a worker,
about 18 GB of it reserved: 5 × 3.59 = 17.95) and been raised to 6 and 7 as the painter's memory came back, each raise only when
another 3.59 GB was free; the alert would have been `memory-fit`, the state `running`. Nothing would have waited.

**Rejected.**

- **Wait for the whole budget** (D521 as written). It is this morning: a step that would run at five waits at zero.
- **Start at one worker.** A pool of one is an hour's progress at a seventh of the rate, holding the machine as if
  it ran; two is the least that is a pool, and below it the painter is the thing to notice (the alert says so).
- **Lower the per-worker need to fit more** (the pilot's 1.36 GB, or the declaration without the measurement). D521's
  floor rule stands: J201's JVMs reached 2.56 GB; the fit divides by the need, it never shrinks it.
- **Raise on pressure alone** (D337's rule unmodified). A fit's workers are what the free memory held; a calm PSI
  with the painter still there would raise into memory that is not free.
- **`degraded` for a fit.** The machine is working; `degraded` means a job waits on memory held outside the lab.

**Tests** (`web/test/lab-runner.test.ts`, the D526 section, nine tests; `tools/auto-review-selftest.mjs`, four
checks): the backoff's `memCap` (no raise past it; absent, D337's rule); a pool of seven at 2.5 GB a worker with
13.5 GB available started with 4 of 7 (control file 4, `JOBS` 7, `running`, the `memory-fit` alert in status.json
and the public copy, the STATUS `workers:` line; a `control: no` job gets `JOBS` 4 and reports 4 everywhere); at
7 GB available it waits (`memory-wait`, `degraded`, for 5 GB, "2 workers; all of them 17.5 GB") and starts with 2
when 9.5 GB are; a step started at 4 is not raised while the painter holds the memory, is raised to 5 and 6 when
6 GB come back and held there, and to 7 when the rest does, the fit then cleared; a pilot fitted at 2 of 3 that is
never raised, and the pool after it fitted again under the run's one alert; the uncapped decision (24.5 GB of
workers counted 21, 24 free: 6 of 7, not 7) and the next block getting its workers back; a memory retry's `minGb`
and its fitted start (4 of its 6); a pressure drop after a fit and a re-raise held at what fits; two heavy jobs in
one admission pass (the first on its least, the second carved out) and `headerNeed`'s block `mem_gb:` exemption;
the review gate closed on a live fit, open once it is raised back or under-sized by pressure alone. One D521
schedule test changed on purpose: its painters were made larger, and a waiting job's `needGb` is that least.

**Deploy** (the merger's; nothing was deployed from this lane). `tools/runner.sh install` only while the runner is
idle — no job running or waiting in a step (D521's Deploy otherwise: install fetches, checks out `origin/main`
detached, rewrites the units and restarts the service, which adopts running units). After the merge is on
origin's `main`: `./tools/runner.sh install --dry-run`, `./tools/runner.sh install`, then `./tools/runner.sh status`
and `./tools/runner.sh budget` (its memory lines name D526).

**Residuals.**

- **A fit may start into pressure the free memory does not show.** The start needs PSI ≤ 5% (D521), and the backoff
  drops a worker on swap-in bursts as it did during match (a).
- **A pilot or a job that cannot be told runs its fit for the whole step**; only a control-file pool is raised.
- **A wall-clock-budgeted match started under-sized** runs fewer games at once, not slower games: `alone: yes`
  still keeps other jobs off its cores, and each game's budget is its own.
- **The readers of `status.json`**: `tools/auto-review.mjs` closes on a live fit (point 5); ForgeCoach's `#lab` page
  should show `memory-fit` beside D521's kinds (its repo).
