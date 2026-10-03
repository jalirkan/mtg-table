# Request to the cloud session: a job runner for Justin's PC, and a progress page

From the PC session, with Justin's decisions of 2026-10-03 10:50 (local). Please build this; the PC
session will only run and report, as now.

## Why

At 10:09:45 systemd-oomd killed Firefox and then the Claude desktop app on Justin's PC, under memory
pressure 2.5 minutes after J003's first run started 7 Forge JVMs (swap had been creeping for 30 min).
Everything the PC session launches lives in the Claude app's cgroup, so the benchmark, the watchers and
Justin's way of reaching the session all died together; he waited 20 minutes on a dead session. The
faults: jobs share fate with the interactive app; nothing budgets memory; the orchestration is ad-hoc
scripts and session-bound watchers; status was reported without a check. J003 was restarted at 10:34 as
its own systemd user unit (MemoryHigh 18G, MemoryMax 22G) at JOBS=6.

## Justin's decisions

- Build a proper runner (not Claude) on the PC. The cloud session writes it.
- Heavy jobs may run at any time; the PC is left on for the lab; the whole machine is the lab's.
  (Still reserve what the OS, the Claude app and the runner need: see the budget.)
- He wants a progress page he can read on his phone: what is running, done / total, rate, ETA, queue.

## The runner (suggested shape)

- A systemd USER service (`forgecoach-runner.service`, enabled, `loginctl enable-linger` documented as
  a one-time step for Justin) installed by `forgecoach install-runner`. It must not depend on any
  Claude session or on the Claude desktop app being open.
- Loop: `git fetch origin pc-jobs`; pick the next open job by the README's rules; check out refs and
  build; run `## Pilot`, evaluate its checks MECHANICALLY (so job files need machine-checkable checks:
  e.g. `check: games == 40`, `check: errors == 0`, `check: median_s between 4 and 12`); run
  `## Commands`; write `results/<id>/STATUS` + raw outputs; push `pc-results`. Summaries that need
  judgment stay with the PC Claude session, which reads the runner's outputs.
- Every job in its own transient unit inside one slice (`forgecoach-lab.slice`) with
  `MemoryHigh=22G MemoryMax=26G`, `ManagedOOMPreference=avoid` on the desktop side / the lab slice as
  the preferred victim, `Nice=10`, and `KillMode=control-group` so a stop is clean. Machine: 16
  threads (8 cores), 30 GB RAM, 8 GB swap.
- Size workers from the pilot: record each worker's PEAK RSS during the pilot, then
  `workers = min(job's max, physical cores - 1, floor(budget / peak))`. Measured today: cube-lab JVMs
  1.3-1.7 GB (2.4 max); ai-bench JVMs reached ~1 GB each within 20 s and 7 of them plus the desktop
  tipped the machine over.
- Back off on pressure, not on a timer: watch `/proc/pressure/memory` (some avg10) and swap-in; above a
  threshold, pause new games / drop a worker; record it in STATUS. Never let the desktop be the victim.
- Jobs must be RESUMABLE or cheap to restart: ai-bench `play` should skip deals already in its shards
  (today a killed run had to be restarted from zero); cubelab already resumes.
- Heartbeat and status written by the runner itself every minute to a local file and pushed every
  5-10 minutes (see below), so a dead Claude session never hides the truth.
- `forgecoach runner status|pause|resume|stop` for Justin; `pause` finishes the current game and holds.

## status.json (the progress page's data)

One file, `status.json`, on `pc-results` (and served locally), written by the runner:

```json
{ "updated": "2026-10-03T10:55:00-04:00", "host": {"load1": 6.2, "memUsedGb": 14.1, "memTotalGb": 30, "swapUsedMb": 0, "pressure": 0.0},
  "running": {"id": "J003", "title": "...", "phase": "night-cube-search (2 of 5)", "started": "...",
              "done": 212, "total": 400, "unit": "games", "ratePerHour": 310, "eta": "2026-10-03T12:40:00-04:00",
              "workers": 6, "errors": 0},
  "queue": [{"id": "J004", "title": "...", "est": "~3 h"}],
  "finished": [{"id": "J002", "status": "done", "finished": "...", "headline": "no detectable difference (+0.01)"}] }
```

Job files should declare how progress is counted (e.g. `progress: wc -l var/ai-bench/night-*/shard-*.jsonl of 2000`).

## The progress page

Justin's preference: a page on the ForgeCoach site so he can open it on his phone (e.g. `#lab`),
showing the running job with a progress bar, done / total, rate, ETA, elapsed, workers, errors, the
queue, the finished jobs with their headline numbers, machine load and memory, and how stale the data
is. Note the data source: mtg-table is private, so the page cannot fetch `status.json` from
raw.githubusercontent without a token; options are (a) the runner also pushes status.json to a small
public place (a `lab-status` branch or a gist in ForgeCoach's repo, numbers only, no card or deck
data), or (b) the page reads it from the PC over Tailscale/LAN through the engine's existing `--lan`
route. Your call; (a) works from anywhere.

Until this exists, the PC session publishes an interim progress page as a private Claude artifact and
refreshes it on every check.
