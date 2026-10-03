id: J027
title: Decision records pilot, re-run after the reveal-leak fix (D352): 20 search-vs-Forge bench games and 20 mixed-profile lab drafts, recorded, redaction-checked mechanically
public_title: Decision records pilot re-run
public_est: ~60 min
cpu: heavy
repos: mtg-table@main (with c/reveal-leak merged, D352)
est: ~60 min
resumable: no
max_workers: 4
timeout: 3h
metrics: bench = aibench var/ai-bench/j027-bench
metrics: lab = cubelab var/cubelab/runs/j027-lab
metrics: recorded_logs = files var/ai-bench/j027-bench/games/*.gz var/cubelab/runs/j027-lab/games/*/*.gz
metrics: redaction_fail = sh: grep -c '^FAIL ' var/j027/redaction.txt || true
metrics: redaction_pass = sh: grep -c '^PASS ' var/j027/redaction.txt || true
metrics: engine_errors = count {logs} "ENGINE ERROR"
metrics: bench_policy = sh: cat var/ml/policy/j027-bench/stats.json
metrics: lab_policy = sh: cat var/cubelab/runs/j027-lab/policy/stats.json
headline: redaction_fail, redaction_pass, recorded_logs, bench.games, lab.drafts, bench_policy.rows, lab_policy.rows
clean: var/j027 var/cubelab/runs/j027-pilot var/cubelab/runs/j027-lab var/ai-bench/j027-bench var/ml/policy/j027-bench

J019 ran the first recording with decision records (D347). It failed on one frame of 80 logs:
`p9-g0-seat0.jsonl.gz`, seq 378. The frame was cut while Swords to Plowshares was exiling
Oracle of Mul Daya. At that moment the Oracle was off the battlefield, but its "top card
revealed" effect was still on, because Forge removes it a few calls later in `changeZone`.
So the opponent's top card was in the viewer's `library.cards`. On `main` (D352), both
snapshot hooks hold that flush and the next frame carries its events. The build's gate step
12i (`MidMoveSelfTest`) reproduces the cut. This job is J019's runs again, with new run
names. The redaction checker's FAIL lines are counted as a metric, and that count must be 0.
All the other checks only ask "is it broken".

## Pilot
About 5 minutes: the build, the D352 self-test and two recorded lab drafts.
```bash
./bridge/build.sh
mkdir -p var/j027
. tools/config.sh
MTG_TABLE_CONFIG="$(forge_home_make "$REPO_ROOT/var/j027/home")" ./bridge/run.sh mtgtable.MidMoveSelfTest var/j027/midmove | tee var/j027/midmove.txt
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 2 --games 1 --jobs 1 --seed 730001 --profile-mix Default:0.5,Reckless:0.25,Default+search:0.25 --record-all --out var/cubelab/runs/j027-pilot
node tools/check-redaction.mjs var/cubelab/runs/j027-pilot/games/*/*.gz > var/j027/pilot-redaction.txt 2>&1 || true
```
metrics: pilot = cubelab var/cubelab/runs/j027-pilot
metrics: pilot_logs = files var/cubelab/runs/j027-pilot/games/*/*.gz
metrics: pilot_redaction_fail = sh: grep -c '^FAIL ' var/j027/pilot-redaction.txt || true
metrics: pilot_redaction_pass = sh: grep -c '^PASS ' var/j027/pilot-redaction.txt || true
metrics: pilot_engine_errors = count {logs} "ENGINE ERROR"
metrics: midmove_ok = sh: grep -c '^MidMoveSelfTest: .* 0 failure(s)$' var/j027/midmove.txt || true
metrics: midmove_failures = sh: grep -c '^  FAIL ' var/j027/midmove.txt || true
check: midmove_ok == 1
check: midmove_failures == 0
check: pilot.drafts == 2
check: pilot.recorded_errors == 0
check: pilot_logs == 4
check: pilot_redaction_fail == 0
check: pilot_redaction_pass == 4
check: pilot_engine_errors == 0

`midmove_ok` counts the self-test's all-clear summary line, and `midmove_failures` its
`FAIL` lines. The redaction check is mechanical: no `FAIL` line, and one `PASS` line for
each of the 4 logs.

## Commands
Run these one after the other:
```bash
mkdir -p var/j027
tools/ai-bench.sh play --pairs tools/ai-bench/pairs-cube.txt --a Default+search --b Default --games 2 --jobs {workers} --seed 31 --run j027-bench --record-all
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 20 --games 1 --jobs {workers} --seed 730101 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 --record-all --out var/cubelab/runs/j027-lab
node tools/check-redaction.mjs var/ai-bench/j027-bench/games/*.gz var/cubelab/runs/j027-lab/games/*/*.gz > var/j027/redaction.txt 2>&1 || true
python3 tools/ml/policy_data.py --vocab cubes/synergy-cube-180.md --out var/ml/policy/j027-bench var/ai-bench/j027-bench/games
python3 tools/ml/policy_data.py --run-dir var/cubelab/runs/j027-lab
```
check: redaction_fail == 0
check: redaction_pass == recorded_logs
check: recorded_logs > 0
check: bench.games > 0
check: lab.drafts == 20
check: lab.recorded_errors == 0
check: engine_errors <= 2
check: bench_policy.rows > 0
check: lab_policy.rows > 0

The checker's output goes to `var/j027/redaction.txt`, and its exit code is ignored on
purpose. The two `redaction_*` checks judge it: no `FAIL` line, and one `PASS` line for
each recorded log.

## Abort if
abort: engine_errors > 2
- Justin starts playing (the runner holds a heavy job by itself).

## Report
collect: var/j027/redaction.txt
collect: var/j027/pilot-redaction.txt
collect: var/ml/policy/j027-bench/stats.json
collect: var/cubelab/runs/j027-lab/policy/stats.json
- The redaction checker over all logs: the number of `FAIL` lines (it must be 0), the number
  of `PASS` lines, and the checker's count of "an opponent's top card revealed by a
  permanent, A3" frames (in its summary line).
- Any `MID-MOVE FLUSH HELD` or `MID-MOVE HOLD GAVE UP` lines in the step logs, with a
  count of each. A `GAVE UP` line is news: report it with its context.
- `var/ml/policy/j027-bench/stats.json` (rows must be > 0) and the lab run's `stats.json`.
- From one search-seat log: the number of decision records, how many carry search stats,
  and how many overrode Forge.
- The number of distinct seat profiles across the 20 lab drafts (must be ≥ 2).
- Bytes per game, and the `uptime` load during the runs.
- A comparison with J019: games, decisions, and the one A3 failure that is now gone.
