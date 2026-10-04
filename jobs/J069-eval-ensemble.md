id: J069
title: Evaluator ensemble (D368): train 4 more seeds of night 1's chosen config on the night-1 dataset, check each one's calibration (gate 1, clause C), and write the ensemble manifest the coach helper serves
public_title: Evaluator ensemble training
public_est: ~2 h
cpu: heavy
after: J052
cores: 6
repos: mtg-table@2ca065f (main with the ensemble and attributions, PR #63, D368)
est: ~1.5-2 h (J060's chosen config took 2,658 s, 32 epochs, to fit beside J059; here two fits at a time at 3 BLAS threads each, then the other two; scoring a few minutes each)
resumable: no
max_workers: 1
mem_per_worker_gb: 6.5
timeout: 6h
clean: var/ml/models/night-1-eval-s1.json var/ml/models/night-1-eval-s2.json var/ml/models/night-1-eval-s3.json var/ml/models/night-1-eval-s4.json var/ml/models/night-1-ensemble.json var/ml/reports/night-1-s1.json var/ml/reports/night-1-s2.json var/ml/reports/night-1-s3.json var/ml/reports/night-1-s4.json var/ml/reports/night-1-s1.txt var/ml/reports/night-1-s2.txt var/ml/reports/night-1-s3.txt var/ml/reports/night-1-s4.txt
metrics: ds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/night-1
metrics: calib = sh: python3 tools/ml/gate_metrics.py calib var/ml/reports/night-1-s1.json var/ml/reports/night-1-s2.json var/ml/reports/night-1-s3.json var/ml/reports/night-1-s4.json
metrics: ens = sh: python3 tools/ml/gate_metrics.py ensemble var/ml/models/night-1-ensemble.json
headline: calib.models, calib.passing, calib.maxEce, ens.n

D368 serves the win chance as the mean of several models of one schema, with their spread (`sd`) beside it
in ForgeCoach ("62% ± 6"). Training one needs no change to `train_eval.py`: the same data, the same split
(`--split-by pair` does not depend on `--seed`) and the same hyperparameters, a different `--seed`. Night 1's
model (`var/ml/models/night-1-eval.json`, J060, gate 1 PASS) is seed 0 of the grid's winner: one hidden layer
of 128, card dim 4, l2 0.001, card l2 0.01, dropout 0.3, lr 0.003 (`night-1.txt`, grid 5). This job fits seeds
1 to 4 of exactly that config, no grid, and writes `var/ml/models/night-1-ensemble.json` naming all five.

Memory: J060 measured train_eval.py's RSS peak at 4.86 GB and the unit's at 6.41 GB with the page cache, on
the full night-1 dataset. Two fits side by side hold about 13 GB of the 23 GB budget, so the fits run in two
pairs (`mem_gb: 14` on that block), each fit pinned to 3 BLAS threads (J060 at an unpinned width used ~680%
CPU; the runner now sets the threads to the width, and this block splits its 6 between the two).

The calibration check is gate 1's clause C (`gates.FIT_RULE`: ECE <= 0.03 and every reliability bin of >= 200
rows within 0.05) on each model's own test split, read from its `--report` -- the same split, functions and
bins as `gate_fit.py score`. Clauses A, B and D are not rerun: A and D were the dataset's and the config's, and
B's Java leaf rows are 30 minutes a model; a seed that fails C is a result, and is left out of the manifest.

`clean:` never names the dataset or `night-1-eval.json`.

## Pilot
metrics: numpy_ok = sh: python3 -c "import numpy; print(1)" 2>/dev/null || echo 0
metrics: pds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/night-1
metrics: base = sh: python3 tools/ml/gate_metrics.py ensemble var/ml/models/night-1-eval.json
check: numpy_ok == 1
check: pds.reservedChecked == 1
check: pds.rows >= 6000000
check: base.loads == 1
check: base.explain == 1
About 2 minutes: the attribution and ensemble tests, the dataset is whole, and night 1's model loads in
`eval_serve.py` with attributions on.
```bash
python3 -m unittest tools/ml/tests/test_attribution.py
test -s var/ml/data/night-1/stats.json
test -s var/ml/models/night-1-eval.json
```

## Commands
cores: 6
mem_gb: 14
```bash
mkdir -p var/ml/reports var/ml/models
fit() {   # one seed of night 1's chosen config (J060, grid 5), no grid
  OMP_NUM_THREADS=3 OPENBLAS_NUM_THREADS=3 MKL_NUM_THREADS=3 \
  python3 tools/ml/train_eval.py var/ml/data/night-1 --split-by pair --batch 4096 \
      --hidden 128 --dim 4 --l2 0.001 --card-l2 0.01 --dropout 0.3 --lr 0.003 --seed "$1" \
      --out "var/ml/models/night-1-eval-s$1.json" --report "var/ml/reports/night-1-s$1.json" \
      > "var/ml/reports/night-1-s$1.txt" 2>&1
}
fit 1 & a=$!; fit 2 & b=$!
wait $a; wait $b
fit 3 & a=$!; fit 4 & b=$!
wait $a; wait $b
tail -n 3 var/ml/reports/night-1-s[1-4].txt
```
cores: 1
```bash
# The manifest: night 1's model and every new seed whose test split passes gate 1's clause C.
python3 - <<'PY'
import json, os, sys
sys.path.insert(0, "tools/ml")
import gate_metrics as M
keep = ["night-1-eval.json"]
for s in (1, 2, 3, 4):
    m = M.m_calib([f"var/ml/reports/night-1-s{s}.json"])
    print(f"seed {s}: ECE {m.get('maxEce', 'n/a')}, worst bin {m.get('maxBinGap', 'n/a')}, clause C {'PASS' if m.get('pass') else 'FAIL'}")
    if m.get("pass") and os.path.isfile(f"var/ml/models/night-1-eval-s{s}.json"):
        keep.append(f"night-1-eval-s{s}.json")
with open("var/ml/models/night-1-ensemble.json", "w", encoding="utf-8") as f:
    json.dump({"format": "mtgtable-position-eval-ensemble", "formatVersion": 1, "models": keep}, f, indent=1)
print("ensemble:", ", ".join(keep))
PY
# The helper's own load of it (every refusal, one layout), and its answers on a committed recording.
python3 tools/ml/eval_serve.py --model var/ml/models/night-1-ensemble.json < /dev/null
sha256sum var/ml/models/night-1-eval*.json
```
check: ds.reservedChecked == 1
check: calib.written == 1
check: calib.models == 4
check: ens.loads == 1
check: ens.n >= 3
check: ens.explain == 1

## Abort if
abort: elapsed_s > 21600

## Report
collect: var/ml/reports/night-1-s1.txt
collect: var/ml/reports/night-1-s2.txt
collect: var/ml/reports/night-1-s3.txt
collect: var/ml/reports/night-1-s4.txt
collect: var/ml/models/night-1-ensemble.json

summary.md:
- each seed's best epoch, val log-loss and test log-loss, ECE and worst reliability bin, beside seed 0's
  (J060: val 0.5071, test 0.4969, ECE 0.0089, worst bin 0.018), and which seeds passed clause C;
- the five (or fewer) models' sha256 (12 hex) and the manifest's `n`;
- the fits' measured peak memory (`memory:` lines) and wall time, one pair at a time;
- after Justin restarts `play.sh`: `/health`'s `evalEnsemble` and `evalExplain`, and a typical `sd` on a
  game's positions (`eval_serve.py --model var/ml/models/night-1-ensemble.json --log <a game>` prints P(win);
  the sd is in the helper's log lines, `p 0.xxx sd 0.xxx`).

Do not tune anything against the test split. A seed that fails clause C stays out of the manifest; it is
not refitted with other settings.
