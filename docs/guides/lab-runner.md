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

## Cores: a job's width, and heavy jobs side by side

A heavy job has a **width**, the cores it keeps busy: its `cores:` header, else its
`max_workers`, else physical cores − 1. A `cores: N` line before a block in `## Pilot` or
`## Commands` sets that block's width (and caps `{workers}` and `$JOBS` in it), and a
`mem_gb: G` line its whole memory reservation, so a running job's width and memory are its
current step's. A declared width also sets `OMP_NUM_THREADS`, `OPENBLAS_NUM_THREADS` and
`MKL_NUM_THREADS` in the step's unit, so numpy keeps to it. The **core budget** is the physical cores (8 on the 9700X;
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
Jobs side by side therefore share `var/` and must not write the same paths.

**Sizing beside others.** A job started beside others is sized against the memory budget less
what the others reserve, so it can get a worker fewer than it would alone. A job is admitted at
its header width; a later block of a running job that is wider than what is free is still
started (a step never waits for cores), so put a job's wide blocks first.

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
| some avg10 ≥ 40%, or the unit at 95% of its `MemoryMax`, 3 samples, with nothing gentler left (or 12 samples whatever) | stop the job (TERM): `waiting`, `memory: …`, `retry_after` +15 min, `workers_cap` one fewer. The retry skips the passed pilot and checks out the same commits. The third memory stop fails the job |
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
  (`resumed:`), at one worker fewer. Otherwise the job starts again from `prepare`
  (`restarted:`), after its `clean:` paths (under `var/` only) are moved aside to
  `.restart-<time>-<name>`. The job's globs never match those, and only the two newest
  copies of each are kept.

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
from the last complete line read before, and memoised by size and mtime. The public copy keeps a `live` key only in the
metric-name shape (never one with a `cubes.` segment) and a finite number for its value; it names the cubes only when the job
file says `public_cubes: yes`, else `cube 1`, `cube 2` …. `running`
includes a job someone else runs: a `running` STATUS without a `runner:` line, such as the
PC session's hand-started unit. `numbers` are the job's `headline:` metrics. The private
copy adds `detail` fields (unit names, reasons) and `runner`.

**The public copy** goes to the orphan branch `lab-status` of the public
`jalirkan/ForgeCoach`. It is one commit, replaced on each push, holding `status.json` and
`ladder.json`, for the `#lab` page. `--public-status off` turns it off. `status.json` is
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
and the experiment log are dropped. It is published whenever the file changes. A field
the page starts to need is a line in both allowlists, in the same change.

**The local server.** The daemon also serves the public copies, and only those, on
`http://127.0.0.1:8645` (`--http-port`, 0 turns it off; `tools/runner/serve.ts`):
`/public-status.json` (also at its old path `/status.json`) and `/public-ladder.json`
(404 when there is no ladder). They are the same sanitised documents `lab-status` carries,
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
  metrics in the slice; and stale git locks. The public-copy tests assert that no card name,
  e-mail address, host name or presence event survives. The cube-lab pool runs under the
  control file with a fake `java`, and the ladder's `drive` with a fake engine.
- On Forge 2.0.14, one JVM at a time, 14 games in all: `ai-bench play` killed after 2 of 4
  games and run again, with the torn line cut off and 4 unique games; a second `play` on
  the folder refused; `--jobs 2` under `maxWorkers 1` running one JVM at a time, the
  second shard parked and started in slot 0; a pause holding the JVM after its game in
  flight; and the cube-lab pool at `--jobs 2` under `maxWorkers 1` running one worker JVM.
- `tools/runner.sh plan` against the real `pc-jobs`, cloning from GitHub.

Only the PC can show the systemd half: real units, the slice's limits, oomd, the measured
peak, the backoff under real pressure, and adoption across a service restart. Job
`tools/runner/jobs/J010-runner-shakedown.md` does that, with a few steps by hand.
