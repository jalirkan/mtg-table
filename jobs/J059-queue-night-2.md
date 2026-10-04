id: J059
title: Overnight queue, night 2: recorded normal + bridge drafts across all cubes, on main with the reveal-leak fix (D352)
public_title: Queue night 2
public_est: ~5 h
public_cubes: yes
cpu: heavy
repos: mtg-table@d68f5ec (main: the reveal-leak fix D352, the runner's cores work #44)
est: ~4-5 h of drafts (night 1 ran 4,750 drafts/h on 7 workers), then ~1 h of redaction checks (resumable)
resumable: yes
max_workers: 6
mem_per_worker_gb: 2
progress: cubelab-queue var/cubelab/queue night 2
headline: night.drafts, night.games, night.engine_error_rate

The second pooled night for the matchup model and the position evaluator. It runs in the same root as
night 1 (`var/cubelab/queue`), so `queue.json` hands out fresh seeds and no draft repeats night 1's. Seeds
stay in the D340 lab range. Every game records both seats' views, with decision records.

**Code version.** Night 1 ran on bf3dca7, before the reveal-leak fix. This night runs on main, so it
appends to the same key folders with `--allow-version-change`, which `run.json` logs. Every
`drafts.jsonl` line carries `ver`, and readers split by it (`matchup.py train --ver`, `dataset.py --ver`).
There's no `--power`: the weights come from the game counts so far, the queue's default.

**Why now.** Gate 1 (D354) is waiting on a memory fix to `train_eval.py`, and gate 1's rule on a FAIL is
"more nights, not a bigger model". The SPRTs J054 and J055 may stop early, as J058 did in an hour.

## Pilot
About 15 minutes; it also measures the real draft rate:
```bash
tools/cubelab.sh queue run --night 1 --drafts 60 --bridge-share 0.2 --chunk 3 --jobs {workers} --record-every 1 --root var/cubelab/queue-pilot-n2
python3 tools/ml/matchup_data.py var/cubelab/queue-pilot-n2 --out var/ml/matchup-pilot-n2/games.jsonl --check
node tools/check-redaction.mjs $(ls var/cubelab/queue-pilot-n2/*/*/games/*/g1-seat*.jsonl.gz | head -6) || echo "redaction FAIL in the pilot sample (quarantined in the full run, not a pilot failure)"
```
metrics: pilot = cubelab-queue var/cubelab/queue-pilot-n2
check: pilot.drafts >= 50
check: pilot.engine_error_rate <= 2%
check: pilot.recorded_errors <= 0.01 * pilot.recorded_games
Checks:
- The queue run exits 0 with no "FAILED".
- `--check` prints 0 BAD and at least 50 valid records.
- The redaction checker: a FAIL here is reported, not a pilot failure (see "Recordings" below).

Record the drafts per hour from the pilot.

## Commands
```bash
tools/cubelab.sh queue plan --night 2 --drafts 20000 --jobs {workers} --allow-version-change > var/cubelab/queue-night-2-plan.txt
timeout -s TERM 15h tools/cubelab.sh queue run --night 2 --drafts 20000 --bridge-share 0.2 --jobs {workers} --record-every 1 --allow-version-change || [ $? -eq 124 ]
```
```bash
mkdir -p var/cubelab/queue-quarantine-n2
find var/cubelab/queue -path '*/games/*' -newer var/cubelab/queue-night-2-plan.txt -name '*.jsonl.gz' -print0 \
  | xargs -0 -r -n 200 -P {workers} node tools/check-redaction.mjs 2>&1 \
  | awk '$1 == "FAIL" {print $2}' > var/cubelab/queue-quarantine-n2/failed.txt || true
while read -r f; do
  [ -f "$f" ] || continue
  d="var/cubelab/queue-quarantine-n2/${f#var/cubelab/queue/}"; mkdir -p "$(dirname "$d")"; mv "$f" "$d"
done < var/cubelab/queue-quarantine-n2/failed.txt
echo "quarantined $(wc -l < var/cubelab/queue-quarantine-n2/failed.txt) recordings"
```
metrics: night = cubelab-queue var/cubelab/queue night 2
check: night.drafts >= 1000
check: night.engine_error_rate <= 2%
check: night.recorded_errors <= 0.01 * night.recorded_games
20,000 is a ceiling, not a target. The run stops itself after 15 hours (`timeout`, exit 124 is
fine): the queue is resumable, and night 3 continues the seeds.

**Recordings.** The reveal leak J019 found is fixed on this commit (D352), so the redaction pass
should quarantine (close to) nothing. It still checks every recording this night wrote (files newer than
the plan) and moves any failure into `var/cubelab/queue-quarantine-n2/`. A count above a handful is a
finding, and the morning read reports it.

## Abort if
abort: night.games >= 500 and night.engine_error_rate > 2%
abort: night.recorded_games >= 500 and night.recorded_errors > 0.01 * night.recorded_games
- More than 2% of the last 500 `[n/m]` lines show `ENGINE ERROR`.
- More than 5% of games end as timeouts or draws.
- Any "recording" warning, or "SAVED Forge preferences".
- Two consecutive "chunk N FAILED" lines.
- Free disk drops under 20 GB. Recordings are about 180 KB per game.

## Report
- The plan header and the drafts per hour.
- `wc -l var/cubelab/queue/*/*/drafts.jsonl`.
- Counts of engine errors, timeouts and recording warnings.
- `du -sh var/cubelab/queue`.
- Copy queue.json and night-2.json.
- The quarantine count (`failed.txt`) and its share of all recordings.
- The morning read (matchup model on nights 1+2) is a separate job, posted after this one finishes.
collect: var/cubelab/queue-quarantine-n2/failed.txt
