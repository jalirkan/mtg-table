## D519 — the lab runner uses the whole machine: the core budget is all threads but two by default (`whole`; `shared` = the physical cores, the old 8), a running job's reservation is its measured peak once the real run has measured it, every step starts only when its expected peak fits the host's actual free memory less 2 GB, a job stopped for memory is retried first as soon as it fits, `status.json` says `degraded` with `alerts` meanwhile, and `tools/runner.sh budget` shows and sets the budgets

*Branch `pc/runner-whole-machine`, off main `310ba71b` (D518's merge). `node tools/decisions.mjs next` printed D519
while two other lanes were taking numbers (one of them D519/D520); if the file name collides at the merge, the merger
renumbers. Amends D337 (the runner, its co-scheduling rule and its memory stop) and D365 (per-step widths: a later job
waiting on memory is excluded from an earlier one's count the way a later job waiting on cores is). Runner code, its
tests and its manual; no job file, bridge, wire or protocol change.*

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
- **Declarations, not measurements, filled the memory budget.** J197 declared `mem_per_worker_gb: 2` and measured
  1.29 (STATUS `peak_worker_rss_gb`); the runner held 7 × 2 = 14 GB for it against its 9.2 GB in use.
- **Nothing read the memory the lab does not own.** The painter's 12 GB were invisible to the budget arithmetic,
  which only sums the lab's own reservations; the only signal was the kill.
- **A watcher could not see it in one read.** `status.json` said `state: running`; J196 sat in `queue` as if it had
  never run.

**Decision.**

1. **The core budget is all threads but two, `whole`, by default** (`tools/runner/budget.ts`): 14 on the 16-thread
   PC. `shared` is the physical cores, 8, the runner's numbers before D519. The heavy jobs running side by side keep
   at most that many busy. A job's own width is unchanged — its `cores:`, else `max_workers`, else physical cores − 1
   — and sizing still caps one job's workers at physical cores − 1: the budget says how many such widths run at once,
   not how wide one job may grow (Rejected). Precedence: `<state>/budget.json`, else the daemon's `--cores N`, else
   `whole`. The memory budget is the lab's as installed (the slice's MemoryMax less a light job's share, 21.4 GB
   here); `budget.json` may only lower the runner's accounting under it.
2. **Measured peaks replace stale declarations** in what a running job holds (`Runner.holdingAt`). The runner now
   samples every `## Commands` step as it sampled the pilot: the largest worker JVM's VmHWM, and every non-prepare
   step's unit's summed VmRSS (`Sys.unitRssGb`: page cache is not counted). Once a commands step has run 10 minutes
   (`MEASURE_MIN_MS`), the largest worker's peak × 1.15 (`MEASURED_MARGIN`) stands in for the sized, declared or
   default per-worker peak — J197's 14 GB becomes 7 × 1.29 × 1.15 = 10.4 GB. A block's `mem_gb:` stays a floor a
   measured peak may only raise (× 1.15). A step never holds less than its unit's RSS now. The measurements are kept
   in run.json and carried to a retry.
3. **The host's actual free memory gates every start.** Before admitting a heavy job (schedule.ts) and before
   starting any step of one (`Runner.memoryWait`), the runner reads MemAvailable from the tick's host sample and
   starts only when the expected peak fits in MemAvailable less 2 GB (`AVAIL_RESERVE_GB`, `--avail-reserve-gb`) less
   what the other running jobs have reserved and not yet touched (each one's holding less its RSS; a step whose unit
   is not running yet, all of it). The expected peak is the step's holding, at most the heavy budget: 2 GB for a
   prepare, at most three workers' worth for a pilot. A GPU painter, a browser, anything outside the slice counts,
   whatever the declarations say. Checked every tick (10 s). Light jobs are exempt: their 2 GB is inside the lab's
   7 GB reserve. A job admitted in a pass counts against the free memory of the jobs after it in the same pass.
4. **A memory stop is retried first, as soon as it fits.** Its `retry_after:` is one minute (`MEMORY_SETTLE_MS`, for
   the freed memory to show), no longer 15. The schedule takes memory retries before every other open job, whatever
   the ids. The retry's need is the holding of the step it resumes at, with the stopped run's measurements
   (`Runner.retryNeeds`; J196's: 1 core, 18 GB). While it settles, or waits for outside memory, it keeps its cores
   and memory reserved inside the budgets (**the carve-out**): a newer job starts only beside it, in what it would
   not use anyway, so it can never land behind a newly started job. A retry the budgets cannot hold beside the
   running jobs stops the queue (D337's order rule). The retry still resumes at its last block (D365), and three
   memory stops still fail the job (`maxMemoryStops`). Any job — not only a retry — that fits the budgets but not
   the actual free memory is blocked `memory-wait` and carved out the same way.
5. **Visibility.** `status.json` gains `alerts: [{ at, id, kind, needGb, availGb, text }]`, newest first: a
   `memory-stop` (with MemAvailable then; kept 24 h), a `memory-retry`, and a live `memory-wait` for each job waiting
   on memory, since when, what its step needs and what was free for it. **`state` is `degraded` while any job waits
   on memory** (a retry waiting for whatever reason, a job blocked `memory-wait`, a running job's step waiting on
   actual memory). The public copy rebuilds each alert from its fields (ids, timestamps, numbers, a fixed kind; the
   text re-made, never copied; the stop's reason, `detail`, private); its signature ignores `availGb`, as it ignores
   the clock. HEARTBEAT.md gains `- state:` and an `- ALERT:` line each; the job's STATUS says the stop as before, and
   a running job's step waiting on memory writes `waits: memory: needs …` there as a cores wait does.
   `tools/runner.sh status` prints `DEGRADED` and the alerts.
6. **`tools/runner.sh budget`** shows the core budget (mode, source, both modes' numbers, what the daemon last
   reported), the memory budget and the actual-memory rule with MemAvailable now. `budget whole`, `budget shared`,
   `budget --cores N`, `budget --mem-gb N` (refused above the lab's: raising it is `install --reserve-gb`, which
   rewrites the slice) and `budget default` (remove budget.json) write `<state>/budget.json`, which the daemon reads
   every tick: no restart. A change is logged once (`budget: cores 8 -> 14`).

**Last night under D519 — honestly.** The memory, not the cores, was what J196 and J197 could not share: J196's fit
declares 18 GB and J197 holds 10.4 measured, 28.4 > 21.4. So D519 would not have run them together. It would have
retried J196 first — at 00:21:31 if the painter had gone, else as soon as MemAvailable showed 20 GB — with J197
waiting behind it, and `status.json` would have said `degraded` from 00:20:31 with the alert "J196 waits for memory
… needs 18 GB, N GB free for it". While the painter held its 12 GB, nothing new would have started: the owner's rule
puts the retry's sunk cost first, and the alert is how the painter gets noticed. Where the jobs do fit, the cores no
longer stop them: two J197-shaped pools (7 wide, 10.4 GB measured each, 20.8 ≤ 21.4) now run side by side on 14 of
16 threads, and a 6-wide encode beside a 7-wide match fits the cores (13 of 14) whenever their memory does.

**Rejected.**

- **Fill the cores first and let the retry wait** (D337's `retry_after` behaviour). The owner's rule is the opposite:
  the retry has sunk cost and never goes behind a newly started job.
- **A bounded priority** (the retry first for N minutes, then backfill anything). After N minutes it is last night
  again; an outsider that persists is answered by the `degraded` state and its alert, not by burying the retry.
- **`memory.current` / systemd's `MemoryPeak` as the measured peak.** Both count page cache, and an I/O-heavy step
  fills its cgroup with cache up to the limit (J196's dry load reads every shard), while MemAvailable counts that
  cache as free. Summed VmRSS is the memory the step cannot give back.
- **A measured peak lowering a block's `mem_gb:`.** A fit's peak comes late (J196's came in post-fit scoring); the
  author's number stays the floor.
- **One job's workers up to the core budget** (13 workers alone in `whole`). The per-job width and sizing are what
  the jobs were tuned and estimated against (J197's estimate is from 7 workers); the extra threads go to a second
  job. A follow-up if a lone job should ever take them.
- **Budgets as the service's ExecStart flags only.** A change would need `install` and a restart; `budget.json` is
  read every tick. `--cores` still works, under it.
- **Raising the memory budget from `budget.json`.** The slice's MemoryHigh/MemoryMax are the hard stop and stay
  as installed; a bigger budget is a bigger slice, `install --reserve-gb`.

**Tests** (`web/test/lab-runner.test.ts`, the D519 section, eight tests): the budgets and their CLI; two jobs
scheduled together in `whole` and not in `shared` or past the memory budget; the actual-memory check blocking an
admission, the carve-out letting a narrow job beside it and stopping a wide one; the retry first, before a lower
id, holding its place while it settles and while it waits, and saying its need when the budgets hold it back; a
measured peak replacing J197's stale declaration only after 10 minutes, never below the RSS, and a `mem_gb:` only
raised; a step waiting for a painter's memory with the lab `degraded`, then starting; a memory stop retried at the
first tick its step fits, 12 minutes after the stop instead of after a newer job, with `degraded`, the alerts in
`status.json`, in the public copy (no private words) and in the pushed HEARTBEAT.md; the public copy's alerts
allowlist. The test world pins `cores: 8` (the numbers the older tests were written against, the `shared` mode) and
its host now has 3 GB in use (the desktop alone, so the budget's 21 GB are really free when nothing runs). One older
assertion changed on purpose: the memory-stop retry test's wait is a minute, not 15.

**Deploy** (the merger's; nothing was deployed from this lane). The deployed runner is the clone
`~/code/lab/runner`, at `ac07876b`; `tools/runner.sh install` is how it moves (cli.ts `install`: it fetches the clone,
checks out `origin/<ref>` detached — refusing a commit on no branch of origin — rewrites the slice and service
units, `daemon-reload`, `enable`, and restarts the service). A restart never stops a job: each step runs in its own
transient unit in `forgecoach-lab.slice`, not under the service (the README's rule 10, `serviceUnit`'s comment), and
the new daemon's `reconcile` adopts every unit still running (`adopted:` in STATUS). After the merge commit is on
origin's `main`:

```bash
cd ~/code/mtg-table
./tools/runner.sh install --dry-run     # the units it would write: the same flags as today, no --cores
./tools/runner.sh install               # --ref main by default; restarts forgecoach-runner.service
systemctl --user status forgecoach-runner.service
journalctl --user -u forgecoach-runner.service -n 40 --no-pager   # "runner: start: ...", J197 adopted
./tools/runner.sh status                # "cores 7/14 in use"; DEGRADED and the alerts if a retry waits
./tools/runner.sh budget                # mode whole, 14 of 16; `budget shared` puts back the old 8, no restart
```

What it will do at once: J197 (adopted, ETA ~09:17) keeps running; its run.json already has hours of step time, so
the first sample of its VmHWM counts as measured and it holds ~10.4 GB. J196 is a memory retry: it goes first, needs
18 GB beside J197's 10.4 in 21.4, so it waits for J197 at the head of the queue, nothing new starts in front of it,
and the lab reads `degraded` with J196's alert until it starts. ForgeCoach's `#lab` page does not know `degraded` or
`alerts` yet (a follow-up in that repo); `status.json`'s other fields are unchanged.

**Residuals.**

- **Two pools side by side raise the host's memory pressure.** J197 alone showed swap-in bursts of 2,000–10,000
  pages a second (its STATUS's pressure lines); the backoff drops a worker on them, and while any running job is
  backed off no job starts beside it (D337, unchanged). A first concurrent night should be read for pressure events.
- **The 10-minute measurement is a heuristic.** VmHWM is a lifetime peak per JVM, so it only grows; a pool whose
  workers grow past 1.15 × their 10-minute peak would have been under-reserved, and the slice and the backoff remain
  the hard stop. Raise `MEASURED_MARGIN` if a night shows it.
- **An outsider that never leaves parks the queue behind a retry.** By design (Rejected); the alert says so.
- **ForgeCoach's `#lab` page** should show `degraded` and the alerts (its repo).
