id: J062
title: Morning read of nights 1 and 2: the matchup model on the queue's drafts (exploring drafts left out), with the questions night 1 pre-registered
public_title: Matchup model read
public_est: ~1 h
cpu: heavy
after: J050
repos: mtg-table@c09ddfa
decides: J029's pre-registered questions: card-level vs archetype-level work (tau), matchup model vs coin, keep or cut the bridge share
rule: J029 "Questions this night answers": tau >= 0.05 card level (+ one design verification), tau < 0.03 archetype level; M0 beats coin with the 95% interval excluding 0; bridge games improve held-out log-loss on the flat cubes, else cut the bridge share; 0.03 <= tau < 0.05 (written 2026-10-04 before the run): keep card-level work, no design verification
followup: queue-night-4
est: ~30-90 min, one process (the matchup model is a few thousand parameters; the bootstrap is the cost)
resumable: no
max_workers: 1
mem_per_worker_gb: 8
timeout: 4h
clean: var/ml/matchup/nights-1-2
metrics: done = sh: test -s var/ml/matchup/nights-1-2/report.md && echo 1 || echo 0
metrics: power = sh: test -s var/ml/matchup/nights-1-2/power.tsv && echo 1 || echo 0

The morning read J029 promised as "a separate job", over nights 1 and 2 (`var/cubelab/queue`, plain drafts
only: `--play-explore exclude`, the default). It answers night 1's pre-registered questions:
1. Card signal strength (tau): at tau >= 0.05, keep card-level work; at tau < 0.03, switch to archetype level.
2. Model vs coin on held-out drafts, with an interval.
3. Whether bridge drafts help the flat cubes.
Its `power.tsv` (posterior SDs) can steer night 4's allocation (`--power`).

`after: J059` because it reads night 2's drafts. It does not touch the queue folder.

## Pilot
About 5 minutes: the matchup tests.
```bash
python3 -m unittest tools/ml/tests/test_matchup.py
```
metrics: numpy_ok = sh: python3 -c "import numpy; print(1)" 2>/dev/null || echo 0
check: numpy_ok == 1

## Commands
```bash
mkdir -p var/ml/matchup
python3 tools/ml/matchup.py train var/cubelab/queue --out var/ml/matchup/nights-1-2 --holdout-cubes all
```
check: done == 1
check: power == 1

## Abort if
abort: elapsed_s > 14400

## Report
collect: var/ml/matchup/nights-1-2/report.md
collect: var/ml/matchup/nights-1-2/balance.json
collect: var/ml/matchup/nights-1-2/power.tsv

summary.md, plainly:
- the drafts and games used per cube and per night;
- tau with its interval, and which side of 0.03 / 0.05 it falls;
- the model vs coin difference on held-out drafts, with its interval;
- the bridge question's answer;
- the job's peak memory (STATUS / the PC's sampling).
