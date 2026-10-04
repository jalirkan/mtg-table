id: J060
title: (J049/J057 again, with the fit-memory fix) Evaluator gate 1: train on the night-1 dataset on disk and run the held-out fit gate (D354)
public_title: Evaluator training and fit gate
public_est: ~4 h
cpu: heavy
after: J029
repos: mtg-table@7e48088 (main with the fit-memory fix, #45; pinned so the truth and the rankers share one code version, D341)
est: ~4 h (the grid gets 3 h; the leaf rows about 30 min on one JVM; no encode: J049 wrote var/ml/data/night-1, 6,343,314 rows, at 02:11)
resumable: no
max_workers: 1
mem_per_worker_gb: 9
timeout: 14h
clean: var/ml/gates/fit var/ml/models/night-1-eval.json
metrics: ds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/night-1
metrics: model = sh: python3 tools/ml/gate_metrics.py file var/ml/models/night-1-eval.json
metrics: leaf = sh: python3 tools/ml/gate_metrics.py lines var/ml/gates/fit/leaf-rows.jsonl
metrics: fit = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/fit/report.json
headline: ds.rows, ds.games, fit.testPairs, fit.leafPositions, fit.pass

Gate 1 again (J049, then J057). J049 built night 1's dataset (`var/ml/data/night-1`, 6,343,314 rows)
and was then stopped on memory; J057 trained on it and was OOM-killed at 19 GB. `train_eval.py` now keeps
the board in int16, re-splits while reading, and standardises in chunks (#45, D354 amendment). That run
measured a 5.5 GiB peak on a synthetic set of night 1's size, with byte-identical outputs. The pilot
measures the real peak with `--dry-load` on the full dataset before the fit starts: under 8 GB, or the job
stops there. `clean:` never names the dataset.

The gate itself is unchanged from J049 (D354): A, B, C, D on the model's held-out pairs.
`gate_fit.py` prints PASS or FAIL; a FAIL verdict is a result, not a failed job.

## Pilot
metrics: numpy_ok = sh: python3 -c "import numpy; print(1)" 2>/dev/null || echo 0
metrics: pds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/night-1
check: numpy_ok == 1
check: pds.reservedChecked == 1
check: pds.rows >= 6000000
About 10 minutes: the gate tests, the dataset is whole, and a dry load of the full dataset at the real
size reports its peak memory.
```bash
python3 -m unittest tools/ml/tests/test_gates.py
test -s var/ml/data/night-1/stats.json
python3 tools/ml/train_eval.py var/ml/data/night-1 --split-by pair --grid --time-budget 10800 --batch 4096 \
    --dry-load --report var/ml/reports/night-1-dry.json
```
metrics: dry_peak_gb = sh: python3 -c "import json; print(json.load(open('var/ml/reports/night-1-dry.json'))['peakGB'])" 2>/dev/null || echo 99
check: dry_peak_gb < 8

## Commands
```bash
mkdir -p var/ml/reports var/ml/models var/ml/gates/fit
python3 tools/ml/train_eval.py var/ml/data/night-1 --split-by pair --grid --time-budget 10800 --batch 4096 \
    --grid-log var/ml/reports/night-1-grid.jsonl --out var/ml/models/night-1-eval.json \
    --report var/ml/reports/night-1.json | tee var/ml/reports/night-1.txt
python3 tools/ml/gate_fit.py heldout --model var/ml/models/night-1-eval.json --out var/ml/gates/fit/heldout.txt
tools/ml/leaf-rows.sh --list var/ml/gates/fit/heldout.txt --model var/ml/models/night-1-eval.json \
    --out var/ml/gates/fit/leaf-rows.jsonl
python3 tools/ml/gate_fit.py score --model var/ml/models/night-1-eval.json --leaf-rows var/ml/gates/fit/leaf-rows.jsonl \
    --report var/ml/gates/fit/report.json | tee var/ml/gates/fit/verdict.txt || true
```
check: ds.reservedChecked == 1
check: ds.games >= 1000
check: model.exists == 1
check: leaf.lines >= 1000
check: fit.written == 1

## Abort if
abort: elapsed_s > 28800

## Report
collect: var/ml/data/night-1/stats.json
collect: var/ml/reports/night-1.txt
collect: var/ml/gates/fit/verdict.txt
collect: var/ml/gates/fit/report.json

summary.md:
- the dry load's peak and the real run's peak (`memory` in `night-1.json`);
- the dataset's rows, games and pairs per split, the versions, and the reserved games dropped;
- the grid's best configuration and the model's sha256 (12 hex);
- gate 1's verdict line, each of A, B, C and D with its numbers and interval, and, on a FAIL,
  which clause failed.

Do not tune anything against the test split, and do not rerun the gate with other settings.
On a FAIL, the next step is more nights, not a bigger model (D354).
