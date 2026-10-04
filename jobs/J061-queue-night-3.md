id: J061
title: Overnight queue, night 3: recorded drafts with play exploration in 15% of drafts (D358)
public_title: Queue night 3
public_est: ~5 h
public_cubes: yes
cpu: heavy
repos: mtg-table@c09ddfa (main with play exploration, D358 / M57)
est: ~4-5 h of drafts (night 1 ran 4,750 drafts/h on 7 workers), then ~1 h of redaction checks (resumable)
resumable: yes
max_workers: 7
after: J050
progress: cubelab-queue var/cubelab/queue night 3
headline: night.drafts, night.games, night.engine_error_rate

The third pooled night. It is like night 2, plus D358 play exploration: 15% of drafts, chosen by seed,
explore every game. Each decision has a 5% chance of a random legal answer, and close calls under 0.02 are
settled by a coin. Openings are left alone. Every randomised decision is tagged (M57). Card win rates and
the matchup model leave exploring drafts out by default; the evaluator's dataset keeps them.

`after: J059` is hard because both nights write the same `var/cubelab/queue` root and `queue.json`, and
two queue runs must not share them.

**Code version.** This changes the code tree and turns exploration on, so the run uses
`--allow-version-change` (D341, logged; readers split by `ver`).

**Watch:** exploring games can record much larger logs (up to ~1 MB a game in tests, against ~165 kB), so
report the disk used and the mean recorded bytes for exploring and plain games separately.

## Pilot
About 15 minutes; it also measures the real draft rate:
```bash
tools/cubelab.sh queue run --night 1 --drafts 60 --bridge-share 0.2 --chunk 3 --jobs {workers} --record-every 1 --root var/cubelab/queue-pilot-n3 --play-explore share=0.5,epsilon=0.05,closecall=0.02
python3 tools/ml/matchup_data.py var/cubelab/queue-pilot-n3 --out var/ml/matchup-pilot-n3/games.jsonl --check
node tools/check-redaction.mjs $(ls var/cubelab/queue-pilot-n3/*/*/games/*/g1-seat*.jsonl.gz | head -6) || echo "redaction FAIL in the pilot sample (quarantined in the full run, not a pilot failure)"
```
metrics: pilot = cubelab-queue var/cubelab/queue-pilot-n3
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
tools/cubelab.sh queue plan --night 3 --drafts 20000 --jobs {workers} --allow-version-change > var/cubelab/queue-night-3-plan.txt
timeout -s TERM 15h tools/cubelab.sh queue run --night 3 --drafts 20000 --bridge-share 0.2 --jobs {workers} --record-every 1 --play-explore share=0.15,epsilon=0.05,closecall=0.02 --allow-version-change || [ $? -eq 124 ]
```
```bash
mkdir -p var/cubelab/queue-quarantine-n3
find var/cubelab/queue -path '*/games/*' -newer var/cubelab/queue-night-3-plan.txt -name '*.jsonl.gz' -print0 \
  | xargs -0 -r -n 200 -P {workers} node tools/check-redaction.mjs 2>&1 \
  | awk '$1 == "FAIL" {print $2}' > var/cubelab/queue-quarantine-n3/failed.txt || true
while read -r f; do
  [ -f "$f" ] || continue
  d="var/cubelab/queue-quarantine-n3/${f#var/cubelab/queue/}"; mkdir -p "$(dirname "$d")"; mv "$f" "$d"
done < var/cubelab/queue-quarantine-n3/failed.txt
echo "quarantined $(wc -l < var/cubelab/queue-quarantine-n3/failed.txt) recordings"
```
metrics: night = cubelab-queue var/cubelab/queue night 3
check: night.drafts >= 1000
check: night.engine_error_rate <= 2%
check: night.recorded_errors <= 0.01 * night.recorded_games
20,000 is a ceiling, not a target. The run stops itself after 15 hours (`timeout`, exit 124 is
fine): the queue is resumable, and night 4 continues the seeds.

**Recordings.** The reveal leak J019 found is fixed on this commit (D352), so the redaction pass
should quarantine (close to) nothing. It still checks every recording this night wrote (files newer than
the plan) and moves any failure into `var/cubelab/queue-quarantine-n3/`. A count above a handful is a
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
- Copy queue.json and night-3.json.
- Disk: `du -sh var/cubelab/queue`, and the mean recorded bytes per game for exploring vs plain games.
- The quarantine count (`failed.txt`) and its share of all recordings.
- The morning read (matchup model on nights 1+2) is a separate job, posted after this one finishes.
collect: var/cubelab/queue-quarantine-n3/failed.txt
