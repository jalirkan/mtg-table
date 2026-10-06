# The lab runner

`tools/runner.sh` runs the `pc-jobs` queue on Justin's PC (D337). It is a systemd **user**
service, `forgecoach-runner.service`. It is not Claude, and it depends on no Claude session
and on no desktop app being open. It does what the PC's Claude session used to do by hand:
fetch the jobs, check refs out and build, run each pilot, check it, run the commands, and
report on `pc-results`. It does all of this mechanically, and it writes facts only. The
summaries that need judgement stay with the PC session, which reads the runner's outputs.

Why it exists: on 2026-10-03 systemd-oomd killed Firefox and the Claude desktop app 2.5
minutes after a benchmark started seven Forge JVMs. Every job lived in the Claude app's
cgroup, so the jobs, the watchers and Justin's way of reaching his PC session all died
together. Now every job step runs in a transient unit of its own, inside a slice with a
memory budget. The runner watches memory pressure and backs off before the kernel or oomd
has to act.

The job-file format and the queue's rules are in `tools/runner/PC-JOBS-README.md`, the
text of the `pc-jobs` branch's README. `tools/runner/jobs/` has worked examples.

## Install (once, on the PC)

```bash
cd /home/justin-a/code/mtg-table            # any checkout of a commit that has tools/runner.sh
./tools/runner.sh install --dry-run         # what it would write and run
./tools/runner.sh install                   # [--ref main] [--reserve-gb 7] [--public-status on|off] [--http-port 8645] [--public-every-s 60] [--public-heartbeat-s 120]
sudo loginctl enable-linger $USER           # ONCE, by Justin: the service keeps running with nobody logged in
./tools/runner.sh status
```

`install` does four things, and never runs sudo:

1. It makes the runner's **own clone**, `~/code/lab/runner`. It borrows objects from
   Justin's checkout while cloning (`--reference-if-able … --dissociate`) and never writes
   to it. It checks out `--ref` (default `main`), which must be a branch or commit on
   origin: what runs is what anyone can review. A `pc/` branch is fine once it is pushed.
   A job never moves the code that runs it. To update the runner, run `install` again
   (`--ref <branch>`).
2. It writes `~/.config/systemd/user/forgecoach-lab.slice`. This is the lab's memory budget,
   with oomd told to act inside the slice first.
3. It writes `forgecoach-runner.service`, with `ExecStart=~/code/lab/runner/tools/runner.sh
   daemon …` and the options you gave.
4. It writes a drop-in for every `app-*.scope` (the desktop's apps, Firefox and the Claude
   app among them) with `ManagedOOMPreference=avoid`. Then it reloads systemd, enables the
   service and restarts it.

Uninstall: `systemctl --user disable --now forgecoach-runner`, then remove the three files
above and `rm -rf ~/code/lab/runner`. Running jobs are units of their own:
`systemctl --user stop 'lab-*'`.

## On the PC: where things are

| Path | What |
|---|---|
| `~/code/lab/runner/` | the runner's code, at the installed commit |
| `~/code/lab/runner/var/runner/` | its state: `status.json` (written every 10 s), `jobs/<id>/` (`run.json`, each step's `.sh`, `.sh.wrap`, `.log`, `.rc`, and `out/`), `control/<id>.json`, `paused`, `requests/` |
| `~/code/lab/mtg-table/`, `~/code/lab/ForgeCoach/` | the heavy jobs' clones. Each job's refs are checked out here, and its `var/` data lives here |
| `~/code/lab/mtg-table-light/`, `~/code/lab/ForgeCoach-light/` | the light jobs' clones, so a light job beside a heavy one never moves its checkout |
| `~/code/lab/mtg-table-lane2/`, `…-lane3/` (and `ForgeCoach-lane<k>`) | the clones of a heavy job started beside another (co-scheduling, below): its own commit and build; its `var/` is a symlink to `~/code/lab/mtg-table/var`, so all outputs stay in one place |
| `~/code/lab/pc-results/` | the runner's worktree of `pc-results` (branch `lab-pc-results`, pushed to `pc-results`) |
| `~/code/lab/lab-status/` | the public copy: one orphan commit with `status.json`, `ladder.json`, `warehouse.json` and `ledger.json`, force-pushed to `jalirkan/ForgeCoach` `lab-status` |

Justin's checkouts (`~/code/mtg-table`, `~/code/ForgeCoach`) are never checked out, built
or written. They are only the reference the clones borrow objects from
(`--reference-if-able … --dissociate`), and the remote URL. When a job's commands name
`/home/justin-a/code/<repo>` or `~/code/<repo>`, the runner rewrites the path to the lab
clone. So a lab run's data (`var/ai-bench/…`, `var/cubelab/…`) is under
`~/code/lab/mtg-table/var/`, not in Justin's checkout.

## Commands

```bash
tools/runner.sh status                 # what runs (phase, done/total, rate, ETA, workers, pressure events), the queue, the machine
tools/runner.sh pause                  # every job's pool finishes the games in flight and holds; nothing new starts
tools/runner.sh resume
tools/runner.sh stop [J###]            # TERM the running job(s) cleanly, mark them waiting, and pause; `resume` carries on
tools/runner.sh hold [--pid N]         # D401: start no new job while process N (default: this shell) lives; running jobs carry on
tools/runner.sh release [--pid N]      # give that hold back; scripts/play.sh --pause-lab does both for its own life
tools/runner.sh logs [J###] [-f] [-n N]   # the current step's log
tools/runner.sh once                   # one loop iteration in the foreground (testing; refuses while the service runs)
tools/runner.sh plan [J###]            # the dry run: every script and systemd-run line the job would get; runs nothing
tools/runner.sh approve J###           # an old-format job waiting after its pilot: run its commands
tools/runner.sh check jobs/J0NN.md [--metrics m.json]   # parse a job file, lint it (D397); evaluate its checks against metrics
tools/runner.sh lint jobs/*.md --jobs-dir jobs          # the lint alone, over many files (--list-rules)
tools/runner.sh dry-run jobs/J0NN.md --root ~/code/lab/mtg-table   # the pilot, then each commands block for 60 s, over an overlay
tools/runner.sh metrics aibench var/ai-bench/night-*    # what an extractor reads, as JSON
journalctl --user -u forgecoach-runner -f               # the runner's own log
systemctl --user list-units 'lab-*'                     # the job steps running now
```

`status`, `pause`, `resume`, `stop` and `logs` read and write the installed runner's state,
`~/code/lab/runner/var/runner/`, from whichever checkout they are run from (`--state DIR`
for another). `pause` takes effect at once, because it rewrites every
running job's control file itself. The daemon picks up a `stop` within 10 s.

## Before a job is posted: the lint and the dry run (D397)

`tools/runner.sh check <job.md>` lints the file after parsing it (`tools/runner/lint.ts`);
a lint **error** fails the check, a warning does not. `tools/runner.sh lint <files...>`
lints many at once. Each rule comes from a job that failed on the PC:

| rule | catches | from |
|---|---|---|
| `timeout-duration` | `timeout 10h30m`, `sleep 1h30m`: GNU takes one number and one unit | J093 |
| `argmax-glob` | an unquoted glob two or more folders deep passed to a program (`$(ls -d var/cubelab/queue/normal/*/games/*)`): over data the job does not make, an error; over a tree it makes, a warning. With `--var DIR` the glob is expanded over the real data and an expansion over half of ARG_MAX is an error | J086 |
| `light-var` | a `cpu: light` job that reads `var/` (a warning since D392) | J088, J090 |
| `metric-self-count` | a metric counting a folder the job's own blocks write a matching file into (redirect, `tee`, `mkdir`, `cp`, `--out`, `clean:`, `collect:`) | J066, J084, J082 |
| `after-missing` | an `after:` id with no file in `--jobs-dir` (default: the `jobs/` folder of a pc-jobs worktree) | |
| `placeholder-id` | `J0XX`, `J###`, `followup: -`, `@<sha>`; `after:` drops a non-id without a word | |
| `bash-syntax` | `bash -n` on every block and `metrics: sh:` line; a here-document that never ends | |
| `python-syntax` | `compile()` on every Python here-document (`python3 - <<'PY'`, `cat > x.py <<'PY'`) and every literal `python3 -c` | |

The lint reads the blocks with a small bash scanner (`shscan.ts`): quoted and unquoted globs,
substitutions, here-documents and `NAME=literal` assignments carried forward. It cannot see
inside a tool, so it cannot know that `cubelab.sh queue run` refuses a folder holding another
run's settings (J096), that a dataset outgrew a memory cap (J087), or that a lane lacks a path.

**The dry run** is for those. `tools/runner.sh dry-run <job.md> --root <checkout>` runs the
lint, then the job's blocks as the runner writes them (`{workers}` = `--workers`, default 2;
`JOBS`, `LAB_CONTROL`, the thread caps; `set -eo pipefail` in the checkout), each stopped after
`--max-seconds` (default 60), and evaluates the pilot's `check:` lines on what the blocks wrote.

- **In a user + mount namespace** (`unshare -Urm`, needs unprivileged user namespaces): an
  overlayfs over the checkout and over the real `var/` it points to, so every write lands in the
  scratch folder and the real tree is never written; every other mount but `/tmp`, `/var/tmp`
  and `/dev/shm` is remounted read-only; each block runs in a network namespace of its own with
  only loopback (`--network` keeps the host's). `--root` may be the lane clone itself: a commit
  other than the job's pin is checked out and built (`--no-build`) inside the overlay. Here the
  `## Commands` blocks run too, each for `--max-seconds`: long enough for a tool to start, read
  its inputs and refuse (J096's version guard, J093's `timeout`, J086's argument list), never to
  do the work. Final checks after cut-short blocks are printed but are not a verdict.
- **Without one** (`--sandbox none`, or an Ubuntu with `apparmor_restrict_unprivileged_userns=1`):
  `--root` must be a scratch checkout (`git worktree add /tmp/j <sha>`) with no `var/`; the dry
  run builds one there: symlinks to the real `var/`'s entries, copies below the folders the
  job's blocks visibly write (files over `--max-copy-mb`, default 64, left out and counted). A
  tool that writes where the lint cannot see would write through a symlink, as a pilot on the
  PC does today, so **only the pilot runs**: `## Commands` never does.

The exit code is 0 when no lint error, no failed block and no failing pilot check was seen; 1
otherwise; 2 when the sandbox or the checkout could not be set up. `--keep` keeps the scratch
folder (the scripts, the logs and the overlay's upper layers: everything the blocks wrote).

## How a job runs

A job is a list of steps. Each shell step is a transient unit,
`lab-<id>-<step>` (`lab-J003-prepare`, `lab-J003-pilot1`, `lab-J003-run1`, …):

```
systemd-run --user --unit=lab-J003-run1 --slice=forgecoach-lab.slice --collect --no-block \
  -p MemoryHigh=18.9G -p MemoryMax=21G -p MemorySwapMax=1G -p Nice=10 -p KillMode=control-group \
  -p KillSignal=SIGTERM -p TimeoutStopSec=90 -p ManagedOOMPreference=none \
  -p WorkingDirectory=~/code/lab/mtg-table -p StandardOutput=append:<log> -p StandardError=append:<log> \
  --setenv=JOBS=7 --setenv=LAB_CONTROL=<control file> … --setenv=LAB_WORKERS=7 … \
  --setenv=MKL_NUM_THREADS=7 --setenv=NUMEXPR_NUM_THREADS=7 --setenv=OMP_NUM_THREADS=7 \
  --setenv=OPENBLAS_NUM_THREADS=7 --setenv=VECLIB_MAXIMUM_THREADS=7 /bin/bash <step>.sh.wrap
```

The wrapper runs the step's script (`bash -eo pipefail`) and writes its exit code to
`<step>.sh.rc`. Just before that, still inside the unit's cgroup, it copies the `oom_kill`
line of the unit's `memory.events` to `<step>.sh.oom`. The runner polls the unit. When the
unit ends, it reads the exit code, or finds none: the unit was killed from outside (oomd,
the kernel, a reboot), which the runner treats as a memory stop. `tools/runner.sh plan
J0NN` prints all of it.

**An OOM kill inside a step is a memory stop too** (D365). When the kernel kills one
process of a step (a JVM over the unit's `MemoryMax`), the script usually goes on to exit
137 (128 + SIGKILL), and the wrapper writes that exit code. An exit code of 137 or 9 is
taken as a memory stop, retried like any other, when there is evidence of an OOM kill:
`oom_kill` above 0 in `<step>.sh.oom`, or, for a unit whose wrapper predates D365,
systemd's `Result=oom-kill` or a line of the unit's journal (`journalctl --user -u
lab-<id>-<step>`) saying a process was killed by the OOM killer. Without that evidence, a
137 is a failure as before (someone's `kill -9`). Any other exit code is a failure, OOM
kill or not.

The steps are: `prepare` (clone if needed, fetch, `checkout --force --detach <ref>`,
`make-forge-home.sh` once, `bridge/build.sh`, and `npm ci` when ForgeCoach's lock file
changed), then `pilot1…n`, then `pilot-checks` (the runner's own), then `run1…n`, then
`final-checks` and `collect`.

**A prepare that git cannot finish yet is retried, not failed** (D391). At boot the PC's git
credentials came about two minutes after login, and the first prepares died with `fatal:
could not read Username for 'https://github.com'` (exit 128); failed jobs then held the
queue. Now a prepare that exits 128 with one of git's "cannot reach the remote" lines
(`could not read Username`, `Could not resolve host`, `Failed to connect to`, `Connection
timed out`, `unable to access 'https://…'`, a 5xx, `RPC failed`, … — `TRANSIENT_GIT` in
`tools/runner/runner.ts`) runs again after 15 s, 30 s, 1 min, then every 2 min, for 10
minutes from the first such failure. The job stays `running` meanwhile (STATUS
`prepare_retry: <n>: <the git line>`), and only after the 10 minutes is it failed, its
reason naming the retries. Any other prepare failure (a build, a ref that does not exist —
also exit 128, without those words) fails at once, as before.

**After the runner starts, it admits no job until git answers** (D391): `git ls-remote
--exit-code origin refs/heads/pc-jobs` in the queue's clone, tried every 20 s. Jobs
already running are monitored meanwhile; the next jobs show in the queue as "waiting for
git to reach the remote". After 10 minutes without an answer it admits them anyway (their
prepares still retry), so a check that cannot pass never stalls the lab.

## Cores: a job's width, and heavy jobs side by side

A heavy job has a **width**, the cores it keeps busy: its `cores:` header, else its
`max_workers`, else physical cores − 1. A `cores: N` line before a block in `## Pilot` or
`## Commands` sets that block's width (and caps `{workers}` and `$JOBS` in it), and a
`mem_gb: G` line its whole memory reservation, so a running job's width and memory are its
current step's. The **core budget** is the physical cores (8 on the 9700X;
`--cores N`). The machine used to count as busy whenever one heavy job ran, however narrow
(J049, a single-threaded encode, left 15 of 16 threads idle for hours); now a heavy job may
start **beside** running heavy jobs (`schedule.ts`) when:

- the widths of the running heavy jobs and its own sum to at most the core budget;
- their memory reservations (a block's `mem_gb:`, else width × per-worker peak: the measured
  one, else `mem_per_worker_gb`, else 2.5 GB) sum to at most the heavy memory budget (below);
- no running job is in memory backoff (a dropped worker or a pause), and the host's memory
  pressure is under the backoff's high line;
- Justin is not at the table, the runner is not paused, and the job is not held by
  `needs: check` or `retry_after:`, as always.

**Order and starvation.** Open jobs are taken in id order, and the first heavy job that could
run but does not fit stops the queue: nothing after it starts beside the running jobs. So a
narrow job never jumps ahead of a wide one, and a wide job gets the machine as soon as the
running jobs end. A job waiting on its `after:` does not stop the queue (it cannot run).
Someone else's running job (a STATUS without `runner:`) has no known width and fills the
machine. `--co-schedule off` restores one heavy job at a time.

**Lanes.** Each heavy job running beside another gets its own clones (`mtg-table-lane2`, …),
checked out at its own pinned commit and built there, so a `prepare` never moves the code
under a running job. `var/` in a lane is a symlink to the first clone's: a later job
(`after:`) finds its predecessor's outputs and the ladder's `ladder.json` stays where it was.
The light job's clone (`mtg-table-light`) is linked the same way (D392), so a light job reads
the `var/cubelab/…` a heavy job wrote; a `var/` it had of its own is moved aside to
`.var-before-lane-<time>`, never deleted. Jobs side by side therefore share `var/` and must
not write the same paths.

**Metrics commands** (`metrics: x = sh: …`) run in the lab slice with `MemoryMax=2G` and a
5-minute limit. One that fails leaves its keys missing (`metrics_errors` counts them) and
`results/<id>/metrics-errors.txt` (or `pilot-metrics-errors.txt`) names the line and why,
node's fatal line rather than its native stack (D393). A reader of a whole night's
`drafts.jsonl` must fit that budget: `calibrate.ts` streams the file and shares its strings.

**Sizing beside others.** A job started beside others is sized against the memory budget less
what the others reserve, so it can get a worker fewer than it would alone. A job is admitted at
its header width.

**Per-step widths: a narrow pilot (D365).** `pilot_cores: N` in the header is the width of
every `## Pilot` step (a pilot block's own `cores:` line wins), and `prepare_cores: N` that of
`prepare`; absent, both are the job's width, as before. While the job is in that step the runner
counts only that width toward co-scheduling, so a narrow job can be admitted beside it: J050's
pilot ran 2 JVMs for 45+ minutes while the job reserved 7 cores and the PC sat at load 2 of 16.
When the job reaches a step wider than the cores the other heavy jobs leave (its first
`## Commands` block, or any block wider than the one before it), the step **waits** for them:
nothing is stopped or killed. While it waits:

- it holds the waiting step's full width, so the scheduler starts nothing new beside it: the
  starvation rule above, applied to a job already running (STATUS `waits: needs 7 core(s) for
  run1; 5 of 8 free …`);
- a first `## Commands` block sized at the pilot's end is sized again when it starts, against
  the memory the others leave then, so a short wait does not cost it workers for the whole run;
- of two jobs waiting to widen, the earlier (by id) goes first: a later waiting job runs nothing
  and does not count against it, so the two never wait for each other.
- a job's step that is no wider than its previous step (or, for its first, than the width it
  was admitted at) never waits: it already held those cores. So a job started beside a narrow
  pilot never waits for the job whose main step is waiting.

Before D365 a wider later block started at once and could briefly crowd a job beside it; it now
waits instead. A job alone never waits.

**Thread pools.** Every step's unit sets `OMP_NUM_THREADS`, `OPENBLAS_NUM_THREADS`,
`MKL_NUM_THREADS`, `NUMEXPR_NUM_THREADS` and `VECLIB_MAXIMUM_THREADS` to the step's width:
the cores the runner reserved for it (the block's `cores:`, else the job's, else its sized
workers, else the width it was admitted at, `max_workers` or physical cores − 1). So numpy,
torch's CPU ops and numexpr keep to the width whether it was declared or not: J060's
`train_eval.py`, at width 1, used about 680% CPU and slowed the job beside it by about 13%. It is the width, not `{workers}`: workers are what memory allows
and mean nothing to a step that runs no pool, and the width is what co-scheduling counts. Java
ignores these variables, so a step of N JVM workers is unaffected. To use more or fewer
threads in a block, export the variable in the block (`export OMP_NUM_THREADS=4`): the script
runs after the unit's environment, so its own value wins (keep it within the width, or declare
a wider `cores:`). `tools/runner.sh plan` prints each step's `threads:`, and the step log's
`==== … started` line says `BLAS/OpenMP threads N`.

`status.json` says `host.coresUsed` of `host.coresTotal` (the running jobs' widths, a light
job's included) and each running job's `cores`; the public copy keeps both.

## Memory: the budget, sizing, backoff

**The budget.** The lab gets the machine minus a reserve for the OS, the desktop, the
Claude app and the runner (`--reserve-gb`, default 7). On the 9700X that is 30 − 7 = 23 GB.
The slice's `MemoryMax` is the budget and its `MemoryHigh` is 1 GB less. A heavy job's unit
gets the budget less 2 GB, which is what a light job beside it may use. `MemoryHigh` is 90%
of the unit's `MemoryMax`, so the job is throttled and reclaimed before anything is killed.

**oomd.** The slice has `ManagedOOMMemoryPressure=kill` at 60%, so oomd watches the lab on
its own and kills inside it, a backstop below the runner's own backoff. The desktop
drop-in asks oomd to avoid the apps. systemd honours `ManagedOOMPreference` only where the
cgroup is owned by root (`systemd.resource-control(5)`), so on a user session it may do
nothing. Neither the slice's limits nor the backoff depends on it. Note the order:
**oomd's 60% kill can fire before the runner's soft backoff has acted.** It needs 30 s
over its limit, while the backoff drops one worker at a time and waits for each drop to
take effect, so a sudden surge can still end in oomd killing a job step. The runner then
sees a unit gone without an exit code, which is a memory stop like any other.

**Workers from the pilot.** During the pilot the runner samples, every 10 s, the peak
resident size (`VmHWM`) of every `java` process in the step's cgroup. The full run gets
`workers = min(max_workers, cores, physical cores − 1, floor(budget / peak × 0.85))`, at least 1,
where peak = max(measured, `mem_per_worker_gb` or 2.5 GB) and budget is the heavy budget
less what the heavy jobs already running reserve. A short pilot whose JVMs never
reached their working size cannot size the full run too large. A pilot runs at most 3
workers. The jobs get the number as `{workers}` and `$JOBS`. STATUS records the sizing and
the limit that decided it.

**Backoff on pressure, not on a timer** (`tools/runner/backoff.ts`). Every 10 s the runner
reads `/proc/pressure/memory` (some avg10, %), the swap-in rate (`pswpin`), and the unit's
`MemoryCurrent`.

| Condition | Action |
|---|---|
| some avg10 ≥ 10%, swap-in ≥ 2000 pages/s, or the unit at 95% of its `MemoryMax`, 2 samples running | one worker fewer. The next drop waits until this one took effect (the unit's Java processes fell to the new cap, since a worker leaves only when its game ends) or 5 minutes, and never comes sooner than 1 minute. At 1 worker, pause new games |
| some avg10 ≥ 40%, or the unit at 95% of its `MemoryMax`, 3 samples, with nothing gentler left (or 12 samples whatever) | stop the job (TERM): `waiting`, `memory: …`, `retry_after` +15 min, `workers_cap` one fewer. The retry skips the passed pilot and the `## Commands` blocks that finished (below), and checks out the same commits. The third memory stop fails the job |
| some avg10 < 2% and swap-in < 100/s for 2 minutes | lift a pause, then one worker back (at most one per 5 minutes, never above the sized count) |

Every event goes to STATUS (`pressure-<n>:`), `events.jsonl` and `status.json`
(`pressureEvents`).

**Whether a job can be told.** Drops and pauses act only on a job whose tools read the
control file. `control: yes|no` in the job file says so. Without it, the runner detects
it after `prepare`: the job's checkout has `tools/runner/control.ts` and its blocks run
`ai-bench.sh`, `cubelab.sh` or `ai-ladder.sh`. A job that cannot be told is only ever
stopped, so its STATUS never shows a drop that did not happen.

**Justin first, and pause.** While any TCP connection is established to the bridge port
(8642: the board, an observer, a phone), the runner starts no heavy job, starts no further
step of a running one, and holds the running step through the same control file. It
resumes when he leaves. `tools/runner.sh pause`, and a backoff pause, hold new steps the
same way. In the public copy this shows only as the neutral reason "held"; no event says
when he sat down or left.

## The pool control file

Every pool that runs engine games reads one small JSON file before it hands out the next
game or match. The path is in `LAB_CONTROL`:

```json
{ "paused": false, "maxWorkers": 5 }
```

- `paused`: the games in flight finish, and no new one starts.
- `maxWorkers`: at most this many worker processes alive. A pool above it lets a worker go
  when that worker's game ends, so its JVM exits and its memory comes back. It starts one
  again when the cap rises.
- If the variable or the file is absent, or the file is half-written or unreadable, the
  pool behaves exactly as before. The runner writes the file atomically (`.part`, then
  rename).

Readers: `tools/cubelab/engine.ts` `runPool` (cube-lab `run`, `queue`, `evolve`,
`selfplay`); `tools/ai-bench.sh play` and `AiBench.java`, where each JVM holds while paused
and exits 75 ("parked") when `maxWorkers` is at or below its slot, and the script starts it
again in a free slot below the cap, where it resumes; and `tools/ai-ladder/bench.ts`
`drive`, where a batch is one JVM. `tools/runner/control.ts` is the reader the TypeScript
pools share.

## Resume

`ai-bench.sh play` resumes (D337). Run the same line again and each JVM skips every game
already in any shard file of the run: same pair, game, seed, configs and decks. A
different configuration in the same `--run` is refused. A torn last line, left by a JVM
killed mid-write, is cut off first. A `flock` on the run folder, inherited by every JVM,
refuses a second `play` on it while any JVM of the first still lives. The cube lab already
resumed (`run` with the same `--out`, `queue run`, `evolve`).

A job says `resumable: yes` when re-running its steps continues its work. On a runner
restart:

- a step whose unit still runs is adopted (`adopted:`); so is one whose state systemctl
  cannot report (a timeout): the runner never takes `unknown` for ended, never orphans a
  live unit, and never starts a step while any `lab-<id>-*` unit is alive;
- a step that ended while the runner was down is read normally. A unit without an exit
  code is taken as killed only once systemd says it is unloaded (`LoadState=not-found`);
- a step that died with the runner: if the job is resumable, the step runs again
  (`resumed:`), at one worker fewer. Otherwise the job starts again (`restarted:`): from
  `prepare`, then at the block that died (below), after the `clean:` paths that block owns
  (under `var/` only) are moved aside to `.restart-<time>-<name>`. The job's globs never
  match those.

**A retry starts at the block that was stopped** (D365). Every `## Commands` block that
finishes is recorded in the job's `run.json` (`blocksDone`: its exit code, when, and a hash
of its text) and in STATUS (`blocks_done: run1 exit 0 at …`). A retry after a memory stop or
`tools/runner.sh stop`, and a restart of a non-resumable job, run `prepare` and then begin
at the first block that is not done, skipping the passed pilot and the finished blocks. A
block the job file has changed since it ran counts as not done, and so does every block
after it. A `run.json` written by a runner from before D365 has no `blocksDone`; the blocks
before the step it stopped at are taken as done (a step only advances on exit 0). This is
what makes splitting a job worthwhile: an encode in one block and a fit in the next means a
stop during the fit never runs the encode again.

What a non-resumable retry moves aside depends on where it starts:

- from `run1`: the header's `clean:` and every block's;
- from a later block: only the `clean:` lines written before that block and the blocks after
  it (`clean:` on its own line before a fenced block in `## Commands`, like `cores:`). The
  header's `clean:` is left alone, since it may hold what the finished blocks made.

A job whose only `clean:` is the header's (every job file written before D365) cannot say
which block made which path, so a retry of it still starts from `run1`, with every `clean:`
path moved aside, as before. To get the resume, give each block its own `clean:` line.
A resumable job is never cleaned; its stopped block runs again and its tools skip what is
done.

**Moved aside, never deleted** (D365). The runner never deletes a `.restart-*` copy (the
job README's promise). STATUS says what they hold: `set_aside: 3 copies, 12.40 GB beside
the job's clean: paths (never deleted: remove them by hand)`, counted over every copy beside
any of the job's `clean:` paths. Remove them by hand once you have looked:
`ls -a var/…; rm -rf var/…/.restart-*`.

**Code versions (D341).** The cube lab's `run`, `evolve` and `selfplay` refuse to resume a
folder made by other code unless given `--allow-version-change`. A runner restart resumes a
step on the checkout it was already using. A retry after a memory stop or a `stop` checks
out the commits the job's first `prepare` recorded (`pinned` in its `run.json`), not the
current tip of a branch like `main`. So neither path changes the code under a resumed run.
A job file edited to a new ref, or a run forgotten by hand (below), starts on the new code,
and needs its own `--out` or `--allow-version-change`.

## status.json, and the public copy

The runner writes `var/runner/status.json` every 10 s. The full copy goes to `pc-results`
with `HEARTBEAT.md` every 4.5 minutes and on every job state change. The public copy (below)
goes to `lab-status` on its own clock, running or idle alike: at once on a job state change;
when what it says changed (the clock aside: `updated`, `heartbeat`, `elapsed`, the rate and
the ETA), at most once a minute; and unchanged, every two minutes anyway, so it is never more
than about two minutes old (`--public-every-s 60`, `--public-heartbeat-s 120`; a failed push
backs off as `pc-results` does). The page warns when the heartbeat is over five minutes old.
Schema 1 (`tools/runner/statusjson.ts`):

```
{ schema: 1, updated, heartbeat, paused,
  state: running|idle, idleSince, idleReason,
  host: { load1, memUsedGb, memTotalGb, swapUsedMb, pressure (some avg10, %), cpus (threads), budgetGb,
          coresUsed, coresTotal },
  running:  [ { id, title, cpu, phase, started, elapsed (s), done, total, unit, ratePerHour, eta,
                workers, workersMax, cores, errors, paused, dataUpdated, pressureEvents: [{ at, kind, workers, pressure }],
                memGb, live: { <metric>: <number> }, liveHeadline: [ <metric> ], cubes: [ { id, done, planned } ] } ],
  queue:    [ { id, title, cpu, est } ],
  waiting:  [ { id, title, reason, est } ],
  finished: [ { id, title, status: done|failed|skipped, finished, headline, numbers: { <metric>: <number> } } ] }
```

Every timestamp is ISO 8601 with an offset, and lists hold at most 50 items. `heartbeat` is
when the runner's loop last ran (every 10 s), so a quiet job is told apart from a dead
runner. `state` is `running` while any job runs (the runner's or someone else's), else
`idle`, with `idleSince` and `idleReason`: `queue empty`, `blocked after J###` (the first
waiting job's unfinished `after:`), `Justin playing` (`held` in the public copy), `paused`,
`memory backoff`, `needs a check`, `job file needs fixing` or `waiting`. The `#lab` page shows
IDLE in red once it has lasted ten minutes.

A running job carries what it is doing now: `phase` (`pilot 1/2`, `commands 1/1`: the step
and the block), `memGb` (its unit's memory as the backoff last read it), and `live`, the
values of its `metrics:` as of the last minute's read (the same read `abort:` uses), the
`headline:` keys first (named again in `liveHeadline`), plus `<name>.drafts_per_h` and
`<name>.games_per_h` for the counters, at most 40, numbers only. A cube-lab queue's `metrics: q = cubelab-queue …` adds
`q.games`, `q.draws`, `q.timeouts`, `q.engine_errors`, `q.engine_error_rate`,
`q.recorded_games`, `q.recorded_errors`, `q.mean_turns`, `q.output_bytes` (the drafts.jsonl
files plus the recordings' bytes as their lines report them, no directory walk),
`q.bridge_share`, and per cube `cubes: [{ id, done, planned }]` (from the night plan's
`normal/<cube>` chunks). Each `drafts.jsonl` is read incrementally on that minute's tick,
from the last complete line read before, and memoised by size and mtime; the reader streams
1 MB at a time and keeps a few numbers per game, never the lines, so the runner's heap stays
in tens of MB whatever the files weigh (D337, amended for J059). The public copy keeps a `live` key only in the
metric-name shape (never one with a `cubes.` segment) and a finite number for its value; it names the cubes only when the job
file says `public_cubes: yes`, else `cube 1`, `cube 2` …. `running`
includes a job someone else runs: a `running` STATUS without a `runner:` line, such as the
PC session's hand-started unit. `numbers` are the job's `headline:` metrics. The private
copy adds `detail` fields (unit names, reasons) and `runner`.

**The public copy** goes to the orphan branch `lab-status` of the public
`jalirkan/ForgeCoach`. It is one commit, replaced on each push, holding `status.json`,
`ladder.json`, `warehouse.json` and `ledger.json`, for the `#lab` pages. `--public-status off` turns it off. `status.json` is
rebuilt field by field from an allowlist (`sanitise`): job ids, numbers, timestamps, and
words from fixed sets (phase, status, reason, event kind). **A job's title and estimate
appear only when its file opts in** with `public_title:` / `public_est:`, written with
letters, digits, spaces and `, : ; ( ) + % ~ # & -` only (no `.`, `/` or `@`, so no path,
host or address). Otherwise the title is the id. A title can name a card, deck or cube, so
it is published only on purpose. The events that would say when Justin sat down or left
are dropped. The headline is re-made from the numbers. No card, deck or cube contents, no
paths, no host names and no line of any log has a field to travel in. `ladder.json` is the AI ladder's `var/ai-ladder/ladder.json` (from `tools/ai-ladder.sh
report`, schema 1) through its own allowlist, `tools/runner/ladder.ts`. Its fields are
exactly ForgeCoach's `LADDER_FIELDS` (`src/lab/ladder.ts`, the leaderboard page):
`generatedAt` and the schema; the anchor, scale and interval method; the deck set's file
name; the totals; and per player its name, kind, flags, rating with its interval, game
counts and record against forge-default. It also has SPRT, tune and league outcomes. Every
value is checked: names and labels against token patterns with no `/`, `.` or `@` (a
player's `@<hex>` hash aside); the set only from a fixed list of the ai-bench pair files,
else null; a promotion's reason only in the one shape the league writes, else
"promoted". Params, hashes, hosts, history
and the experiment log are dropped. It is published whenever the file changes.
`warehouse.json` is the lab warehouse's summary (`python3 tools/lab/warehouse.py export`,
`var/warehouse/warehouse.json`, schema 1, D363, `docs/guides/lab-warehouse.md`) through
`tools/runner/warehouse.ts`, for the `#lab/data` page: table rows and bytes, per-night
counts, archive and disk sizes, and per cube its counts, colour-pair rates and the top and
bottom 25 cards by win rate. Counts must be non-negative integers and rates in [0, 1] (a row
with one outside is dropped); a table, cube or pair is a token; a card name is letters,
digits, spaces and card-name punctuation, at most 60 characters, with `/` only as a split
card's ` // `. Any other key is dropped. It too is published whenever the file changes.
`ledger.json` (D387) is the decision ledger's public copy, made from `ledger.jsonl` in the
pc-results worktree through `tools/runner/ledgerpublic.ts`, for ForgeCoach's morning report:
the newest 100 entries, each with its id, the opt-in `public_title:` / `public_decides:` (else
null), the rule's D-numbers, `gate N` and `*_RULE` names only, the outcome, a cause word for a
failure (never the reason), whether it had `check:` lines, its headline numbers, its finish
time and its follow-ups as job ids or template names. It is written only when there is an
entry, and published whenever `ledger.jsonl` changes. A
field a page starts to need is a line in both allowlists, in the same change.

**The local server.** The daemon also serves the public copies, and only those, on
`http://127.0.0.1:8645` (`--http-port`, 0 turns it off; `tools/runner/serve.ts`):
`/public-status.json` (also at its old path `/status.json`), `/public-ladder.json`
(404 when there is no ladder), `/public-warehouse.json` (404 when there is no summary) and
`/public-ledger.json` (404 when there is no ledger entry). They are the same sanitised documents `lab-status` carries,
made fresh on each request, so the `#lab` page opened on the PC itself reads them first and
shows what the runner wrote seconds ago. The server binds 127.0.0.1 and nothing else. CORS
names `https://jalirkan.github.io` and the localhost dev origins (`http://localhost:<port>`,
`http://127.0.0.1:<port>`), never `*`; a request from any other origin gets 403. An
`OPTIONS` preflight is answered with `Access-Control-Allow-Private-Network: true`, which a
browser asks for (Private Network Access) before an https page may read a loopback address.

### Optional: the page on a phone, through Tailscale

A phone cannot reach `127.0.0.1` on the PC, and plain `http://<pc>:8645` over the LAN does
not work either: the page is https, and browsers block an https page's requests to plain
http (mixed content). With [Tailscale](https://tailscale.com) on the PC and the phone, and
HTTPS certificates turned on for the tailnet (admin console, DNS, *HTTPS Certificates*),
proxy an https name on the tailnet to the local server:

```bash
tailscale serve --bg http://127.0.0.1:8645   # https://<machine>.<tailnet>.ts.net -> the local server
tailscale serve status                      # what is served; `tailscale serve reset` stops it
```

Then open the page on the phone with the source named:

```
https://jalirkan.github.io/ForgeCoach/#lab?src=https://<machine>.<tailnet>.ts.net/public-status.json
```

`tailscale serve` (not `funnel`) is reachable from your tailnet only, and its requests
arrive on loopback, so the server still binds 127.0.0.1 and still serves only the public
copies. Without it, the phone reads `lab-status` on GitHub, as before.

## The decision ledger

Four optional header lines say what a job is for (D366): `decides:` (the decision its result
informs), `hypothesis:`, `rule:` (the pre-registered pass/fail rule, or a pointer to it) and
`followup:` (job files under `jobs/` or template names). `tools/runner.sh check` prints them
and warns about a heavy job with no `decides:`. At each job end (done, failed, aborted) the
runner appends an entry to `ledger.jsonl` and `LEDGER.md` at the root of `pc-results`, in the
commit that carries the STATUS, never to `lab-status`; only its allowlisted public copy,
`ledger.json`, goes there (D387, *The public copy* above). A done job's follow-up that is not on
pc-jobs gets one `FOLLOW-UP READY [<id>@<finished>]` line at the top of HEARTBEAT.md's
`## Messages`; a follow-up already posted with `after:` on the job needs nothing. Which entries
are pushed is kept in `var/runner/ledger.json`, whose `since` is the first time a runner kept a
ledger: jobs that ended before it are not backfilled. The pc-jobs README's *The decision
ledger* has the format and an example; `tools/runner/ledger.ts` is the code.

## Security: who can run code on the PC

**Whoever can push to `pc-jobs` can run code on Justin's PC.** A job file's blocks run as
Justin's user, unattended, within the minute. The runner limits where they run (its own
clones, the lab slice) and what it publishes, but not what a block does. Protect the
branch: on GitHub, a branch protection rule (or ruleset) for `pc-jobs` that restricts who
may push, and no force pushes. Treat write access to jalirkan/mtg-table as the keys to the
PC. The runner's own pushes go only to `pc-results` and ForgeCoach's `lab-status`, whose
names are fixed in its code.

## When something is wrong (for the PC session)

- **Is it running?** `systemctl --user status forgecoach-runner`, then `journalctl --user -u
  forgecoach-runner -n 200`, then `tools/runner.sh status`. After five failed starts in ten
  minutes systemd gives up (`StartLimitBurst`): fix the cause, then `systemctl --user
  reset-failed forgecoach-runner && systemctl --user start forgecoach-runner`. A pid file
  left by a crash or a reboot does not block a start: it counts only while its process is
  a live runner. Stale git locks in the runner's own `pc-results` worktree and `lab-status`
  repo are removed at start.
- **The network is down.** Fetches and pushes time out after 30 s and never prompt, and the
  jobs are monitored before any git call. A failed publish is retried after 30 s, then 1,
  2, 4 … up to 30 minutes (the public copy on its own count, the same way). A job file is treated as removed only after it is missing from
  two successful reads of `pc-jobs`.
- **A step failed.** `results/<id>/failure.txt` on `pc-results` has the exit code and the
  log tail. The whole log is `var/runner/jobs/<id>/<step>.log`. The exact script is
  `<step>.sh` beside it, and running `bash <step>.sh` by hand reproduces it.
- **A unit will not start.** `systemctl --user status lab-<id>-<step>`. Run the
  `systemd-run` line from `tools/runner.sh plan <id>` by hand.
- **The runner should forget a job's run** (start it fresh): stop the service, remove
  `var/runner/jobs/<id>/`, set the job's STATUS to `waiting` on `pc-results`, then start
  the service.
- **Fixes** go on a `pc/<topic>` branch from a fresh `origin/main` in a separate worktree,
  never in `~/code/lab/runner`, under the pc-jobs README's rules. Test the fix with
  `(cd web && node --test test/lab-runner.test.ts)`, push the branch, then install it on the
  PC (`tools/runner.sh install --ref pc/<topic>`) if it is urgent. Say so in HEARTBEAT.md's `## Messages`.
- **Back to running by hand:** `systemctl --user stop forgecoach-runner`. Running jobs keep
  running in their units. Write STATUS files without a `runner:` line, and the runner will
  leave those jobs alone when it comes back.

## What was verified where

In the cloud container (4 shared cores, no systemd user session):

- `web/test/lab-runner.test.ts`: the check language, job files (every job on `pc-jobs`
  parses), scheduling, sizing, the units' `systemd-run` lines, backoff, the extractors,
  progress, status.json and both public allowlists. It also runs the runner end to end
  against real git repositories with a fake systemd: pilot, checks, sizing, commands,
  collect, publish; an old-format job stopping after its pilot, then approved; a failed
  pilot; a failed command; an abort; a memory stop and its capped retry; Justin at the
  table; a restart that adopts, resumes and restarts; and a hand-run job blocking heavy
  work. Co-scheduling: widths and reservations, admission by cores and by memory, memory
  backoff, order and starvation, and end to end a wide job waiting, then starting beside a
  narrow block in a lane of its own whose `var/` is the first clone's. Since the review it also covers: an `unknown` unit state never orphaning a step; no
  start beside a live unit; steps held while paused, playing or backoff-paused; a stale pid
  file; a dead network (the queue kept, publishing backing off); a job file missing from
  only one read; a script that still names Justin's checkout; a collected `STATUS`; globs
  with `[`; the sizing floor and the pilot cap; control detection; three memory stops
  failing a job, with the retries on the pinned commit; `approve` failing loudly; `sh:`
  metrics in the slice; and stale git locks. Since D365: a memory-stop or `stop` retry, and
  a restart, starting at the stopped block with the finished blocks skipped (also from a
  pre-D365 `run.json`, and not past a block the job file changed); per-block `clean:` moving
  aside only the re-run blocks' paths; an old job file with only a job-wide `clean:`
  retrying from `run1` as before; `.restart-*` copies all kept, with their disk use in
  STATUS; a `pilot_cores:` pilot letting a narrow job start beside it, its main step waiting
  (holding its full width, so a job that would fit the cores really free does not start) and
  starting when they are free; two jobs waiting to widen, the earlier going first; and a step exiting 137 or 9 after an OOM kill (the wrapper's `memory.events`, or
  the fake systemd's journal line) stopped for memory, while 137 without evidence fails. The public-copy tests assert that no card name,
  e-mail address, host name or presence event survives. The cube-lab pool runs under the
  control file with a fake `java`, and the ladder's `drive` with a fake engine.
- On Forge 2.0.14, one JVM at a time, 14 games in all: `ai-bench play` killed after 2 of 4
  games and run again, with the torn line cut off and 4 unique games; a second `play` on
  the folder refused; `--jobs 2` under `maxWorkers 1` running one JVM at a time, the
  second shard parked and started in slot 0; a pause holding the JVM after its game in
  flight; and the cube-lab pool at `--jobs 2` under `maxWorkers 1` running one worker JVM.
- `tools/runner.sh plan` against the real `pc-jobs`, cloning from GitHub.
- `web/test/lab-runner-lint.test.ts` (D397): each lint rule on the job shape that failed and on
  its control (a rule with no case fails the test), the scanner, `check` failing on an error, and
  the dry run in a namespace (a commands block refusing the real folder caught, the real `var/`
  byte-identical after) and without one (the pilot only). `tools/runner.sh lint` over every job
  on `pc-jobs` (J001-J096); the namespace was exercised as root in the container, never yet as
  an unprivileged user on the PC.

Only the PC can show the systemd half: real units, the slice's limits, oomd, the measured
peak, the backoff under real pressure, and adoption across a service restart. That includes
D365's OOM evidence: the wrapper's read of a real unit's `memory.events` and the journal's
wording on the PC's systemd were not seen in the container (no systemd user session there). Job
`tools/runner/jobs/J010-runner-shakedown.md` does that, with a few steps by hand.
