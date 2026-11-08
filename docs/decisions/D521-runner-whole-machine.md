## D521 — the lab runner uses the whole machine: the core budget is all threads but two by default (`whole`; `shared` = the physical cores, the old 8), every step starts only when its expected peak fits the host's actual free memory less 3 GB under 5% memory pressure, a job stopped for memory is retried first as soon as it fits, a declaration is a floor that a measured peak may only raise, `alone: yes` keeps wall-clock-budgeted jobs by themselves, `status.json` says `degraded` and carries `alerts`, and `tools/runner.sh budget` shows and sets the budgets

*Branch `pc/runner-whole-machine`, off main `310ba71b` (D518's merge). `node tools/decisions.mjs next` printed D519 when the lane
started; it was renumbered D521 before the merge, because J197's job text reserves D519 for its SMALL GAIN reading and
D520 is the fit-saves-first lane's. Amends D337 (the runner, its co-scheduling rule and its memory stop) and D365 (per-step widths: a later job
waiting on memory is excluded from an earlier one's count the way a later job waiting on cores is). Runner code, its
tests, its lint and its manual; no bridge, wire or protocol change. A skeptic review of the first version changed
eight things; they are folded in below, and its numbers replace the first version's.*

**2026-11-08**

**Context.** The owner had said "the machine is all yours, use the resources productively", and his PC sat with
8 of its 16 threads idle all night. What the runner did (pc-results STATUS files, lab-status `status.json` at 06:34):

- **The core budget was the physical cores.** `status.json` said `coresTotal: 8` of `cpus: 16`; J197 held 7. Every
  other heavy job waited for a width of 1 or less. `--cores` existed but the installed service never passed it.
- **A memory stop sent its job to the back of the queue.** J196's fit (run3, `cores: 1`, `mem_gb: 18`, after 3 h 45 min
  of run1 and run2) was killed at 00:20:31 without an exit code — the OOM killer, in post-fit scoring, while a GPU
  painter outside the lab slice held 12 GB. The runner wrote `retry_after: 00:35:31` and, `retry_after` being in
  the future, a blocked job that does not hold the queue, started the next open job at 00:20:32: J197, a 9.5-hour
  match on 7 workers. J196's retry would have come after J197's end, about 10:00.
- **Nothing read the memory the lab does not own.** The painter's 12 GB were invisible to the budget arithmetic,
  which only sums the lab's own reservations; the only signal was the kill.
- **A watcher could not see it in one read.** `status.json` said `state: running`; J196 sat in `queue` as if it had
  never run.
- **The declarations were not stale.** J197 declares `mem_per_worker_gb: 2`. Its STATUS's `peak_worker_rss_gb: 1.29`
  is the PILOT's peak (the runner sampled VmHWM in pilots only); its live JVMs showed VmHWM 1.40–1.85 GB at the
  review (the largest 1.76 then), and one grew 36% over hours. The first version of this decision read 1.29 as the
  run's peak and let 10 minutes × 1.15 replace the declaration (10.4 GB for J197); that would have under-reserved.

**Decision.**

1. **The core budget is all threads but two, `whole`, by default** (`tools/runner/budget.ts`): 14 on the 16-thread
   PC. `shared` is the physical cores, 8, the runner's numbers before D521. The heavy jobs running side by side keep
   at most that many busy. A job's own width is unchanged — its `cores:`, else `max_workers`, else physical cores − 1
   — and sizing still caps one job's workers at physical cores − 1: the budget says how many such widths run at once,
   not how wide one job may grow (Rejected). Precedence: `<state>/budget.json`, else the daemon's `--cores N`, else
   `whole`; an unreadable or invalid budget.json is ignored. The memory budget is the lab's as installed (the slice's
   MemoryMax less a light job's share, 21.4 GB here); `budget.json` may only lower the runner's accounting under it.
2. **A declaration is a floor; a measurement may only raise it** (`Runner.holdingAt`). The runner now samples every
   `## Commands` step as it sampled the pilot: the largest worker JVM's VmHWM, and the step's unit's anonymous memory
   from its cgroup's `memory.stat` (`anon` plus `shmem`; `Sys.unitAnonGb`) — page cache not counted, and a forked
   pool's shared pages counted once (a sum of VmRSS counts them in every child: `dataset.py`, `dataset_merge.py` and
   `rollout_labels.py` fork). Once a step has run **60 minutes** (`MEASURE_MIN_MS`), a measured peak × **1.4**
   (`MEASURED_MARGIN`) is compared with the floor and the larger stands: the largest worker's VmHWM × 1.4 against the
   sized or declared per-worker peak, the unit's anon peak × 1.4 against a block's `mem_gb:`. J197: max(2, 1.76 × 1.4
   = 2.46) × 7 = **17.2 GB** after an hour, against its 14 GB declared. A step never holds less than its unit's anon
   memory now. The measurements are kept in run.json, carried to a retry and through a restart.
3. **The host's actual free memory gates every start.** Before admitting a heavy job (schedule.ts) and before
   starting any step of one (`Runner.memoryWait`), the runner reads MemAvailable from the tick's host sample and
   starts only when the expected peak fits in MemAvailable less **3 GB** (`AVAIL_RESERVE_GB`, `--avail-reserve-gb`:
   systemd-oomd watches user@1000 at 50% pressure, and swap is full) less what the other running jobs have reserved
   and not yet touched (each one's holding less its anon memory; a step whose unit is not running yet, all of it),
   **and** the host's memory pressure, PSI `some avg10`, is at most **5%** (`START_MAX_SOME10`). The expected peak is
   the step's holding — 2 GB for a prepare, at most three workers' worth for a pilot — counted at most the INSTALLED
   heavy budget, never a lowered one. A GPU painter, a browser, anything outside the slice counts, whatever the
   declarations say. Checked every tick (10 s). Light jobs are exempt: their 2 GB is inside the lab's 7 GB reserve.
   A job admitted in a pass counts against the free memory of the jobs after it in the same pass.
4. **A memory stop is retried first, as soon as it fits.** Its `retry_after:` is one minute (`MEMORY_SETTLE_MS`, for
   the freed memory to show), no longer 15. The schedule takes memory retries before every other open job, whatever
   the ids. The retry's need is the holding of the step it resumes at, with the stopped run's measurements
   (`Runner.retryNeeds`; J196's: 1 core, 18 GB). While it settles, or waits for memory, it keeps its cores and memory
   reserved inside the budgets **and its need reserved out of the actual free memory** (the carve-out): a newer job
   starts only beside it, and never in the memory it waits for. A retry the budgets cannot hold beside the running
   jobs stops the queue (D337's order rule). The retry still resumes at its last block (D365); three memory stops
   still fail the job (`maxMemoryStops`), and the third is alerted like the others. Any job — not only a retry — that
   fits the budgets but not the actual free memory is blocked `memory-wait` and carved out the same way.
5. **`alone: yes`.** A job header the scheduler honours: such a job is admitted only onto an empty machine (no heavy
   or light job of this runner, no one else's running job), and nothing, heavy or light, is admitted beside it; while
   it is next and waits for the running jobs to end, nothing newer starts (code `alone`). Two jobs on shared physical
   cores change what a wall-clock budget buys, so **every ladder match job — D398's fixed matches, anytime search
   budgets (`budgetMs`) — must carry `alone: yes`**. The lint (rule `alone-ladder`) warns on a job that runs
   `ai-ladder.sh match` without it.
6. **Visibility, in two kinds.** `status.json` gains `alerts: [{ at, id, kind, needGb, availGb, freeGb, behind,
   text }]`, newest first: `memory-stop` (with MemAvailable then; kept 24 h; the third stop too), `memory-retry`,
   and, for each job waiting now and since when (kept across a restart in runner.json): **`memory-wait`** — "J196
   waits on memory held outside the lab slice since … (MemAvailable 12 GB, need 18 GB)" — and **`budget-wait`** —
   "J196 waits on the budget behind J197 since … (need 18 GB, 7.4 GB of the budget free)". **`state` is `degraded`
   only for a `memory-wait`** (or memory pressure); a retry waiting on the budget behind a running job leaves the
   state `running`, with its alert. A retry's minute of settle is neither. The public copy rebuilds each alert from
   its fields (ids, timestamps, numbers, a fixed kind; the text re-made, never copied; the stop's reason, `detail`,
   private); its signature ignores `availGb`, as it ignores the clock. HEARTBEAT.md gains `- state:` and an
   `- ALERT:` line each; the job's STATUS says the stop as before, and a running job's step waiting on memory writes
   `waits: memory: …` there as a cores wait does. `tools/runner.sh status` prints `DEGRADED` and the alerts.
7. **`tools/runner.sh budget`** shows the core budget (mode, source, both modes' numbers, what the daemon last
   reported), the memory budget and the actual-memory rule with MemAvailable now. `budget whole`, `budget shared`,
   `budget --cores N`, `budget --mem-gb N` and `budget default` (remove budget.json) write `<state>/budget.json`, which
   the daemon reads every tick: no restart; a change is logged once (`budget: cores 8 -> 14`). `--mem-gb` is refused,
   exit 2, above the lab's budget (a bigger budget is a bigger slice: `install --reserve-gb`), under 4 GB, or below
   what any running or waiting job needs — the daemon writes those needs to `<state>/needs.json` every tick.

**Last night under D521 — honestly.** The memory, not the cores, was what J196 and J197 could not share: J196's fit
declares 18 GB and J197 holds 14 GB declared (17.2 GB once its hour of measurement raises it), more than 21.4. So
D521 would not have run them together. It would have retried J196 first — at 00:21:31 if MemAvailable had held
21 GB, else as soon as it did — with J197 waiting behind it, and `status.json` would have said `degraded` from
00:21:31 with "J196 waits on memory held outside the lab slice (MemAvailable …, need 18 GB)". While the painter held
its 12 GB, nothing new would have started: the owner's rule puts the retry's sunk cost first, and the alert is how
the painter gets noticed. Where jobs do fit, the cores no longer stop them: a one-core job (up to 4.2 GB beside
J197's 17.2) now runs beside a 7-wide match, where before one core was all there was; a 6-wide encode at 1.5 GB a
worker (9 GB) beside a 7-wide pool at 1.5 GB a worker (10.5 GB) fits 13 of 14 threads and 19.5 of 21.4 GB. Two
Forge match pools at their declared 2 GB a worker (14 GB each) never pair — and as ladder matches they carry
`alone: yes` anyway.

**Rejected.**

- **Fill the cores first and let the retry wait** (D337's `retry_after` behaviour). The owner's rule is the opposite:
  the retry has sunk cost and never goes behind a newly started job.
- **A bounded priority** (the retry first for N minutes, then backfill anything). After N minutes it is last night
  again; an outsider that persists is answered by the `degraded` state and its alert, not by burying the retry.
- **A measurement that replaces (or lowers) a declaration** — the first version of this decision, 10 minutes × 1.15.
  VmHWM grows for hours (J197: +36% in one JVM), a fit's peak comes late (J196), and J197's "1.29" was a pilot's
  peak. A declaration is the author's statement of the peak; a measurement can only show it was too low.
- **`memory.current` / systemd's `MemoryPeak` as the measured peak.** Both count page cache, and an I/O-heavy step
  fills its cgroup with cache up to the limit (J196's dry load reads every shard), while MemAvailable counts that
  cache as free. **A sum of VmRSS** over-counts a forked pool's shared pages once per child. `memory.stat` `anon` +
  `shmem` is the memory the unit cannot give back, counted once.
- **One job's workers up to the core budget** (13 workers alone in `whole`). The per-job width and sizing are what
  the jobs were tuned and estimated against (J197's estimate is from 7 workers); the extra threads go to a second
  job. A follow-up if a lone job should ever take them.
- **Budgets as the service's ExecStart flags only.** A change would need `install` and a restart; `budget.json` is
  read every tick. `--cores` still works, under it.
- **Raising the memory budget from `budget.json`**, or a cap that shrinks a need. The slice's MemoryHigh/MemoryMax are
  the hard stop and stay as installed; a lowered cap only stops admissions, it never lets a step be counted smaller.

**Tests** (`web/test/lab-runner.test.ts`, the D521 section, thirteen tests; the lint's case in
`web/test/lab-runner-lint.test.ts`): the budgets, an invalid budget.json ignored in a running daemon, and the CLI
(`--mem-gb` refused above the lab, under 4 GB and below a waiting job's need); a budget.json change taking effect at
the next tick; two jobs together in `whole` and not in `shared` or past the memory budget; the actual-memory check
(the reserve, the running jobs' untouched reserve, PSI over 5%, the installed cap under a lowered budget, the carve-out
reserving the free memory a waiting job needs); the retry first, before a lower id, holding its place while it
settles, waits on memory (`wait: memory`) or on the budget (`wait: budget`, `behind`); `alone: yes` keeping jobs
apart and holding the queue; `memory.stat` parsing; the 60-minute / ×1.4 floor rule (not at 30 minutes, raised at
61, never lowered, never under the anon memory, a block's `mem_gb:` likewise) and the measurements surviving an
adoption; a step waiting on outside memory and on pressure, `degraded` meanwhile, its reserve counted against a new
admission; a memory stop retried at the first tick its step fits, never behind a newer job, `degraded`, its alerts in
`status.json`, the public copy and HEARTBEAT.md, and its "since" kept across a restart; three stops with the settle,
the third failing and alerted; the public alerts allowlist (both wait kinds, `behind` ids only). The test world
pins `cores: 8` (the numbers the older tests were written against, the `shared` mode) and its host has 3 GB in use
(the desktop alone). One older assertion changed on purpose: the memory-stop retry test's wait is a minute, not 15.

**Deploy** (the merger's; nothing was deployed from this lane). The deployed runner is the clone
`~/code/lab/runner`, at `ac07876b`; `tools/runner.sh install` is how it moves (cli.ts `install`: it fetches the clone,
checks out `origin/<ref>` detached — refusing a commit on no branch of origin — rewrites the slice and service
units, `daemon-reload`, `enable`, and restarts the service). A restart never stops a job: each step runs in its own
transient unit in `forgecoach-lab.slice`, not under the service (the README's rule 10, `serviceUnit`'s comment), and
the new daemon's `reconcile` adopts every unit still running (`adopted:` in STATUS).

**First, while a ladder match runs:** J197 is a ladder match (fixed games at wall-clock budgets) and its job file
has no `alone: yes`. Under D521 a narrow job could be admitted beside it and change what its budgets buy. Either add
`alone: yes` to J197's header on `pc-jobs` before installing (the runner re-reads job files every minute; the
header line changes no block, so nothing reruns), or install after J197 ends (its ETA was ~09:17). After the merge
commit is on origin's `main`:

```bash
cd ~/code/mtg-table
./tools/runner.sh install --dry-run     # the units it would write: the same flags as today, no --cores
./tools/runner.sh install               # --ref main by default; restarts forgecoach-runner.service
systemctl --user status forgecoach-runner.service
journalctl --user -u forgecoach-runner.service -n 40 --no-pager   # "runner: start: ...", running units adopted
./tools/runner.sh status                # "cores N/14"; DEGRADED and the alerts if a job waits on outside memory
./tools/runner.sh budget                # mode whole, 14 of 16; `budget shared` puts back the old 8, no restart
```

What it will do at once, if J197 still runs: J197 is adopted; its run.json has hours of step time, so its first
VmHWM sample counts as measured, and it holds max(2, largest VmHWM × 1.4) × 7 — about 17–18 GB at the review's
1.76–1.85. J196 is a memory retry: it goes first, needs 18 GB, which does not fit the budget beside J197, so it waits
on the budget behind J197 at the head of the queue (`budget-wait` alert, state `running`), and nothing new starts
in front of it. ForgeCoach's `#lab` page does not know `degraded`, `alerts` or the `alone` reason yet (a follow-up in
that repo); `status.json`'s other fields are unchanged.

**Residuals.**

- **Two pools side by side raise the host's memory pressure.** J197 alone showed swap-in bursts of 2,000–10,000
  pages a second (its STATUS's pressure lines); the backoff drops a worker on them, a start needs PSI at or under 5%,
  and while any running job is backed off no job starts beside it (D337, unchanged). A first concurrent night should
  be read for pressure events.
- **A job's first hour runs on its declaration.** That is the point of a floor; a declaration that is too low is
  raised only after an hour, and the slice and the backoff remain the hard stop meanwhile.
- **An outsider that never leaves parks the queue behind a retry.** By design (Rejected); the alert says so.
- **Every ladder match job file must carry `alone: yes`**: the lint warns, the runner cannot know otherwise.
- **ForgeCoach's `#lab` page** should show `degraded`, the two alert kinds and the `alone` reason (its repo).
