id: J049
title: (re-post of J034, after numpy) Evaluator gate 1: train the position evaluator on night 1 and run the held-out fit gate (D354)
public_title: Evaluator training and fit gate
public_est: ~6 h
cpu: heavy
after: J029
repos: mtg-table@9ca3329 (main with the gates merged, #36; pinned so the truth and the rankers share one code version, D341)
est: ~4-7 h (encode about 1,000 rows/s single-threaded; the grid gets 3 h; the leaf rows about 30 min on one JVM)
resumable: no
max_workers: 1
mem_per_worker_gb: 14
timeout: 14h
clean: var/ml/data/night-1 var/ml/gates/fit var/ml/gates/pilot-fit
progress: metric ds.rows rows
metrics: ds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/night-1
metrics: model = sh: python3 tools/ml/gate_metrics.py file var/ml/models/night-1-eval.json
metrics: leaf = sh: python3 tools/ml/gate_metrics.py lines var/ml/gates/fit/leaf-rows.jsonl
metrics: fit = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/fit/report.json
headline: ds.rows, ds.games, fit.testPairs, fit.leafPositions, fit.pass

Gate 1 of the learned position evaluator (D354, the engine review's H4). The job trains
D316's evaluator on night 1's recorded queue games (J029, every normal and bridge folder; one
vocabulary, the union of the normal folders' own cube lists), split by deck pair. Then it
runs the pre-registered fit gate on the model's held-out pairs:
- A: beat the core 12-feature logistic on log-loss, the bootstrap interval over pairs above 0;
- B: beat the hand leaf through D349's fitted scale on rebuilt turn-end positions;
- C: calibration;
- D: enough data.

`gate_fit.py` prints PASS or FAIL. The job itself only checks that nothing is broken: a FAIL
verdict is a result, not a failed job.

## Pilot
metrics: numpy_ok = sh: python3 -c "import numpy; print(1)" 2>/dev/null || echo 0
check: numpy_ok == 1
About 10 minutes on 30 drafts of one cube: the build, the gate tests, a tiny dataset and
model, and the whole gate-1 chain end to end.
```bash
./bridge/build.sh
python3 -m unittest tools/ml/tests/test_gates.py
P=var/ml/gates/pilot-fit; rm -rf "$P"; mkdir -p "$P"
C=$(ls -d var/cubelab/queue/normal/*/ | head -1)
python3 tools/ml/dataset.py --vocab "${C}cube.md" --out "$P/data" --shard-rows 5000 $(ls -d "${C}games"/* | head -30)
python3 tools/ml/train_eval.py "$P/data" --split-by pair --hidden 16 --epochs 3 --patience 3 --out "$P/m.json"
python3 tools/ml/gate_fit.py heldout --model "$P/m.json" --out "$P/heldout.txt"
tools/ml/leaf-rows.sh --list "$P/heldout.txt" --model "$P/m.json" --out "$P/leaf-rows.jsonl"
python3 tools/ml/gate_fit.py score --model "$P/m.json" --leaf-rows "$P/leaf-rows.jsonl" --report "$P/report.json" || true
```
metrics: pds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/gates/pilot-fit/data
metrics: pleaf = sh: python3 tools/ml/gate_metrics.py lines var/ml/gates/pilot-fit/leaf-rows.jsonl
metrics: pfit = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/pilot-fit/report.json
check: pds.reservedChecked == 1
check: pds.rows >= 1000
check: pleaf.lines >= 10
check: pfit.written == 1

Broken-or-not only. The dataset drops the reserved decks (D340) and has rows. Java rebuilt and
scored some held-out turn ends. The gate wrote its report. Thirty drafts are far too few for a
PASS, and the pilot does not ask for one.

## Commands
```bash
mkdir -p var/ml/reports var/ml/models var/ml/gates/fit
V=(); for d in var/cubelab/queue/normal/*/; do V+=(--vocab "${d}cube.md"); done
python3 tools/ml/dataset.py "${V[@]}" --out var/ml/data/night-1 --shard-rows 5000 $(ls -d var/cubelab/queue/*/*/games)
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
abort: elapsed_s > 46800

## Report
collect: var/ml/data/night-1/stats.json
collect: var/ml/reports/night-1.txt
collect: var/ml/gates/fit/verdict.txt
collect: var/ml/gates/fit/report.json

summary.md:
- the dataset's rows, games and pairs per split, the versions, and the reserved games dropped;
- the grid's best configuration and the model's sha256 (12 hex);
- gate 1's verdict line, each of A, B, C and D with its numbers and interval, and, on a FAIL,
  which clause failed.

Do not tune anything against the test split, and do not rerun the gate with other settings.
On a FAIL, the next step is more nights, not a bigger model (D354).
