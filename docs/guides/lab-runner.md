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
cd /home/justin-a/code/mtg-table            # any checkout at the commit to run, a pc/ branch included
git fetch && git checkout <commit or branch>
./tools/runner.sh install --dry-run         # what it would write and run
./tools/runner.sh install                   # [--reserve-gb 7] [--public-status on|off] [--http-port 8645]
sudo loginctl enable-linger $USER           # ONCE, by Justin: the service keeps running with nobody logged in
./tools/runner.sh status
```

`install` does four things, and never runs sudo:

1. It makes the runner's **own checkout**: `~/code/lab/runner`, a detached worktree of the
   checkout you ran it from, at that checkout's commit. A job never moves the code that runs
   it. To update the runner, run `install` again from a checkout at the new commit.
2. It writes `~/.config/systemd/user/forgecoach-lab.slice`. This is the lab's memory budget,
   with oomd told to act inside the slice first.
3. It writes `forgecoach-runner.service`, with `ExecStart=~/code/lab/runner/tools/runner.sh
   daemon …` and the options you gave.
4. It writes a drop-in for every `app-*.scope` (the desktop's apps, Firefox and the Claude
   app among them) with `ManagedOOMPreference=avoid`. Then it reloads systemd, enables the
   service and restarts it.

Uninstall: `systemctl --user disable --now forgecoach-runner`, then remove the three files
above and `git worktree remove ~/code/lab/runner`. Running jobs are units of their own:
`systemctl --user stop 'lab-*'`.

## On the PC: where things are

| Path | What |
|---|---|
| `~/code/lab/runner/` | the runner's code, at the installed commit |
| `~/code/lab/runner/var/runner/` | its state: `status.json` (written every 10 s), `jobs/<id>/` (`run.json`, each step's `.sh`, `.sh.wrap`, `.log`, `.rc`, and `out/`), `control/<id>.json`, `paused`, `requests/` |
| `~/code/lab/mtg-table/`, `~/code/lab/ForgeCoach/` | the heavy jobs' clones. Each job's refs are checked out here, and its `var/` data lives here |
| `~/code/lab/mtg-table-light/`, `~/code/lab/ForgeCoach-light/` | the light jobs' clones, so a light job beside a heavy one never moves its checkout |
| `~/code/lab/pc-results/` | the runner's worktree of `pc-results` (branch `lab-pc-results`, pushed to `pc-results`) |
| `~/code/lab/lab-status/` | the public copy: one orphan commit with `status.json` and `ladder.json`, force-pushed to `jalirkan/ForgeCoach` `lab-status` |

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
tools/runner.sh logs [J###] [-f] [-n N]   # the current step's log
tools/runner.sh once                   # one loop iteration in the foreground (testing; refuses while the service runs)
tools/runner.sh plan [J###]            # the dry run: every script and systemd-run line the job would get; runs nothing
tools/runner.sh approve J###           # an old-format job waiting after its pilot: run its commands
tools/runner.sh check jobs/J0NN.md [--metrics m.json]   # parse a job file; evaluate its checks against metrics
tools/runner.sh metrics aibench var/ai-bench/night-*    # what an extractor reads, as JSON
journalctl --user -u forgecoach-runner -f               # the runner's own log
systemctl --user list-units 'lab-*'                     # the job steps running now
```

`status`, `pause`, `resume`, `stop` and `logs` read and write the installed runner's state,
`~/code/lab/runner/var/runner/`, from whichever checkout they are run from (`--state DIR`
for another). `pause` takes effect at once, because it rewrites every
running job's control file itself. The daemon picks up a `stop` within 10 s.

## How a job runs

A job is a list of steps. Each shell step is a transient unit,
`lab-<id>-<step>` (`lab-J003-prepare`, `lab-J003-pilot1`, `lab-J003-run1`, …):

```
systemd-run --user --unit=lab-J003-run1 --slice=forgecoach-lab.slice --collect --no-block \
  -p MemoryHigh=18.9G -p MemoryMax=21G -p MemorySwapMax=1G -p Nice=10 -p KillMode=control-group \
  -p KillSignal=SIGTERM -p TimeoutStopSec=90 -p ManagedOOMPreference=none \
  -p WorkingDirectory=~/code/lab/mtg-table -p StandardOutput=append:<log> -p StandardError=append:<log> \
  --setenv=JOBS=7 --setenv=LAB_WORKERS=7 --setenv=LAB_CONTROL=<control file> … /bin/bash <step>.sh.wrap
```

The wrapper runs the step's script (`bash -eo pipefail`) and writes its exit code to
`<step>.sh.rc`. The runner polls the unit. When the unit ends, it reads the exit code, or
finds none: the unit was killed from outside (oomd, the kernel, a reboot), which the
runner treats as a memory stop. `tools/runner.sh plan J0NN` prints all of it.

The steps are: `prepare` (clone if needed, fetch, `checkout --force --detach <ref>`,
`make-forge-home.sh` once, `bridge/build.sh`, and `npm ci` when ForgeCoach's lock file
changed), then `pilot1…n`, then `pilot-checks` (the runner's own), then `run1…n`, then
`final-checks` and `collect`.

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
nothing. Neither the slice's limits nor the backoff depends on it.

**Workers from the pilot.** During the pilot the runner samples, every 10 s, the peak
resident size (`VmHWM`) of every `java` process in the step's cgroup. The full run gets
`workers = min(max_workers, physical cores − 1, floor(budget / peak × 0.85))`, at least 1.
`mem_per_worker_gb:` is a floor under the measured peak. With neither, the peak is taken as
2.5 GB. The jobs get the number as `{workers}` and `$JOBS`. STATUS records the sizing and
the limit that decided it.

**Backoff on pressure, not on a timer** (`tools/runner/backoff.ts`). Every 10 s the runner
reads `/proc/pressure/memory` (some avg10, %), the swap-in rate (`pswpin`), and the unit's
`MemoryCurrent`.

| Condition | Action |
|---|---|
| some avg10 ≥ 10% or swap-in ≥ 2000 pages/s, 2 samples running | one worker fewer (at most one per minute); at 1 worker, pause new games |
| some avg10 ≥ 40%, or the unit at 95% of its `MemoryMax`, 3 samples, with nothing gentler left (or 12 samples whatever) | stop the job (TERM): `waiting`, `memory: …`, `retry_after` +15 min, `workers_cap` one fewer; the retry skips the passed pilot |
| some avg10 < 2% and swap-in < 100/s for 2 minutes | lift a pause, then one worker back (at most one per 5 minutes, never above the sized count) |

Every event goes to STATUS (`pressure-<n>:`), `events.jsonl` and `status.json`
(`pressureEvents`).

**Justin first.** While any TCP connection is established to the bridge port (8642: the
board, an observer, a phone), the runner starts no heavy job and holds a running one,
through the same control file. It resumes when he leaves.

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

- a step whose unit still runs is adopted (`adopted:`);
- a step that ended while the runner was down is read normally;
- a step that died with the runner: if the job is resumable, the step runs again
  (`resumed:`). Otherwise the job starts again from `prepare` (`restarted:`), after its
  `clean:` paths (under `var/` only) are moved aside to `.restart-<time>-<name>`. They are
  never deleted, and the job's globs never match them.

## status.json, and the public copy

The runner writes `var/runner/status.json` every 10 s and serves its public copy on
`http://127.0.0.1:8645/status.json`, with `Access-Control-Allow-Origin: *` (`--http-port`,
`--http-host`). The full copy goes to `pc-results` with `HEARTBEAT.md` every 4.5 minutes
and on every job state change. Schema 1 (`tools/runner/statusjson.ts`):

```
{ schema: 1, updated, paused,
  host: { load1, memUsedGb, memTotalGb, swapUsedMb, pressure (some avg10, %), cpus (threads), budgetGb },
  running:  [ { id, title, cpu, phase, started, elapsed (s), done, total, unit, ratePerHour, eta,
                workers, workersMax, errors, paused, dataUpdated, pressureEvents: [{ at, kind, workers, pressure }] } ],
  queue:    [ { id, title, cpu, est } ],
  waiting:  [ { id, title, reason, est } ],
  finished: [ { id, title, status: done|failed|skipped, finished, headline, numbers: { <metric>: <number> } } ] }
```

Every timestamp is ISO 8601 with an offset, and lists hold at most 50 items. `running`
includes a job someone else runs: a `running` STATUS without a `runner:` line, such as the
PC session's hand-started unit. `numbers` are the job's `headline:` metrics. The private
copy adds `detail` fields (unit names, reasons) and `runner`.

**The public copy** goes to the orphan branch `lab-status` of the public
`jalirkan/ForgeCoach`. It is one commit, replaced on each push, holding `status.json` and
`ladder.json`, for the `#lab` page. `--public-status off` turns it off. `status.json` is
rebuilt field by field from an allowlist (`sanitise`): job ids, titles with anything
path-, URL-, host- or address-like cut out, numbers, timestamps, and words from fixed sets
(phase, status, reason, event kind). The headline is re-made from the numbers. No card,
deck or cube contents, no paths, no host names and no line of any log has a field to
travel in. `ladder.json` is the AI ladder's `var/ai-ladder/ladder.json` (from `tools/ai-ladder.sh
report`, schema 1) through its own allowlist, `tools/runner/ladder.ts`. Its fields are
exactly ForgeCoach's `LADDER_FIELDS` (`src/lab/ladder.ts`, the leaderboard page):
`generatedAt` and the schema; the anchor, scale and interval method; the deck set's file
name; the totals; and per player its name, kind, flags, rating with its interval, game
counts and record against forge-default. It also has SPRT, tune and league outcomes. Every
value is checked: names and labels against token patterns with no `/`, the set cut to its
file name, a promotion's reason through the title cleaner. Params, hashes, hosts, history
and the experiment log are dropped. It is published whenever the file changes. A field
the page starts to need is a line in both allowlists, in the same change.

## When something is wrong (for the PC session)

- **Is it running?** `systemctl --user status forgecoach-runner`, then `journalctl --user -u
  forgecoach-runner -n 200`, then `tools/runner.sh status` from `~/code/lab/runner`.
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
  `(cd web && node --test test/lab-runner.test.ts)`, then install it on the PC from that branch's worktree
  (`tools/runner.sh install`) if it is urgent. Say so in HEARTBEAT.md's `## Messages`.
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
  work. The cube-lab pool runs under the control file with a fake `java`, and the ladder's
  `drive` with a fake engine.
- On Forge 2.0.14, one JVM at a time, 14 games in all: `ai-bench play` killed after 2 of 4
  games and run again, with the torn line cut off and 4 unique games; a second `play` on
  the folder refused; `--jobs 2` under `maxWorkers 1` running one JVM at a time, the
  second shard parked and started in slot 0; a pause holding the JVM after its game in
  flight; and the cube-lab pool at `--jobs 2` under `maxWorkers 1` running one worker JVM.
- `tools/runner.sh plan` against the real `pc-jobs`, cloning from GitHub.

Only the PC can show the systemd half: real units, the slice's limits, oomd, the measured
peak, the backoff under real pressure, and adoption across a service restart. Job
`tools/runner/jobs/J010-runner-shakedown.md` does that, with a few steps by hand.
