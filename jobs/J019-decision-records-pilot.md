id: J019
title: Decision records pilot: 20 search-vs-Forge bench games and 20 mixed-profile lab drafts, recorded
public_title: Decision records pilot
public_est: ~60 min
cpu: heavy
after: J010
repos: mtg-table@main (with PR #35, decision records, D347)
est: ~60 min
max_workers: 4

The first real recording run with decision records (D347). It proves the records are complete
and clean before any overnight data is recorded. All checks are "is it broken" bounds only.

## Pilot
```bash
cd /home/justin-a/code/mtg-table && ./bridge/build.sh
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 2 --games 1 --jobs 1 --seed 730001 --profile-mix Default:0.5,Reckless:0.25,Default+search:0.25 --record-all --out var/cubelab/runs/j019-pilot
node tools/check-redaction.mjs var/cubelab/runs/j019-pilot/games/*/*.gz
```
Checks:
- The build prints "build OK".
- There are 4 `.gz` files under var/cubelab/runs/j019-pilot/games.
- The redaction checker exits 0.
- There are no `ENGINE ERROR` lines.

## Commands
Run these one after the other:
```bash
tools/ai-bench.sh play --pairs tools/ai-bench/pairs-cube.txt --a Default+search --b Default --games 2 --jobs {workers} --seed 31 --run j019-bench --record-all
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 20 --games 1 --jobs {workers} --seed 730101 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 --record-all --out var/cubelab/runs/j019-lab
node tools/check-redaction.mjs var/ai-bench/j019-bench/games/*.gz var/cubelab/runs/j019-lab/games/*/*.gz
python3 tools/ml/policy_data.py --vocab cubes/synergy-cube-180.md --out var/ml/policy/j019-bench var/ai-bench/j019-bench/games
python3 tools/ml/policy_data.py --run-dir var/cubelab/runs/j019-lab
```

## Abort if
- Justin starts playing.
- More than 2 `ENGINE ERROR` lines.

## Report
- The redaction checker's exit code over all logs (it must be 0).
- `var/ml/policy/j019-bench/stats.json` (rows must be > 0) and the lab run's `stats.json`.
- From one search-seat log: the number of decision records, how many carry search stats, and
  how many overrode Forge.
- The number of distinct seat profiles across the 20 lab drafts (must be ≥ 2).
- Bytes per game, and the `uptime` load during the runs.
