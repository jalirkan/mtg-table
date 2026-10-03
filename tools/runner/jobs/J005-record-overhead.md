id: J005
title: Recording overhead on the 9700X (wall clock), recording on vs off
cpu: heavy
after: J003
repos: mtg-table@main (a43dea2 or later; this adds --record-all)
est: ~25 min
resumable: yes
max_workers: 7
mem_per_worker_gb: 1.7
timeout: 2h
progress: cubelab var/cubelab/runs/j005-ovh-off var/cubelab/runs/j005-ovh-on of 300
metrics: off = cubelab var/cubelab/runs/j005-ovh-off
metrics: on = cubelab var/cubelab/runs/j005-ovh-on
metrics: engine_error_lines = count {logs} "ENGINE ERROR"
headline: off.mean_game_ms, on.mean_game_ms, off.ms_per_turn, on.ms_per_turn, on.recorded_bytes_per_game, off.games, on.games

**Seeds (methodology review 2):** seeds 9100–9109 per cube are the AI ladder's dev/confirm
deck sets, and recording games on them would leak those decks into training data, so this
job uses seeds 710001+ and 720001+.

Afterwards J004 (the Omega evolve) runs with `--record-all`. This job checks first that
recording doesn't slow the lab down much. Resumable: `cubelab.sh run` with the same `--out`
skips the drafts already in drafts.jsonl.

## Pilot
```bash
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 4 --games 1 --jobs 2 --seed 710001 --record-all --out var/cubelab/runs/j005-pilot-rec
node tools/check-redaction.mjs var/cubelab/runs/j005-pilot-rec/games/*/*.gz
python3 tools/ml/encode.py --run-dir var/cubelab/runs/j005-pilot-rec --out /dev/null 2>&1 | tee var/cubelab/runs/j005-pilot-rec/encode.txt
```
metrics: pilot = cubelab var/cubelab/runs/j005-pilot-rec
metrics: gz_files = files var/cubelab/runs/j005-pilot-rec/games/*/*.gz
metrics: encoded_8_games = count var/cubelab/runs/j005-pilot-rec/encode.txt "from 8 game(s)"
check: gz_files == 8
check: encoded_8_games == 1
check: pilot.engine_errors == 0 and engine_error_lines == 0
check: pilot.recorded_games == 4 and pilot.recorded_errors == 0

(The redaction checker is a line of the block: under `set -e` its non-zero exit fails the
pilot.)

## Commands
Run these one after the other, never at the same time:
```bash
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 150 --games 1 --jobs {workers} --seed 720001 --out var/cubelab/runs/j005-ovh-off
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 150 --games 1 --jobs {workers} --seed 720001 --record-all --out var/cubelab/runs/j005-ovh-on
```
check: off.drafts == 150 and on.drafts == 150
check: off.engine_errors + on.engine_errors <= 2
check: on.recorded_errors == 0

## Abort if
abort: engine_error_lines > 2
abort: on.recorded_errors > 0

(Justin starting to play no longer needs a line here: the runner holds every heavy job
while he is at the table.)

## Report
The runner's metrics.json has, per arm, games, mean ms a game, ms a turn, CPU ms a turn and
bytes a recorded game; the PC session puts the two arms side by side in summary.md, with
the wall time of each run from the step logs' `matches:` lines.
