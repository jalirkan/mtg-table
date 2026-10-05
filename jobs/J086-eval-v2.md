id: J086
title: Evaluator v2 (D364): nights 1-3 dataset, split audit, learning curve (plain vs game-weighted), successive-halving search, gate 1 on v2 and v2 against v1 on the same test pairs
public_title: Evaluator v2 training
public_est: ~12 h
cpu: heavy
after: J061
repos: mtg-table@ef7e73f (main with evaluator v2 (D364) and D383's test fixture fix; J067 on 58f3fa5 failed its pilot on test_eval_v2, which that commit predates)
decides: whether evaluator v2 (nights 1-3, D364) replaces v1 as the candidate for gate 2 (J081) and the coach's win chance
hypothesis: three nights of data and the successive-halving search give v2 a lower held-out log-loss than v1 on the same test pairs, and it passes gate 1
rule: gates.py gate 1 (D354) on v2, and eval_compare.py's paired difference v1 - v2 on the same held-out pairs with its 95% interval excluding 0 (D364)
followup: jobs/J081-gate2-v2.md
est: ~10-13 h (encode ~2.5 h at 6 processes; dry load ~0.5 h; curve 6 fits, ~2.5 h with 2+ workers, ~5 h with 1 (about 1 min an epoch of a quarter of ~15 M training rows per worker, float32, one thread, measured on a slower shared machine); search 4 h budget; leaf rows 2 x ~30 min on one JVM; gate score and comparison ~40 min)
resumable: no
max_workers: 6
mem_per_worker_gb: 1.5
timeout: 8h
clean: var/ml/gates/fit-v2 var/ml/gates/pilot-v2 var/ml/models/nights-1-3-eval.json var/ml/reports/v2-pilot-dry.json var/ml/reports/v2-dry.json var/ml/reports/v2-curve.json var/ml/reports/v2.json var/ml/reports/v2-search.jsonl var/ml/reports/v2-compare.json
metrics: ds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/nights-1-3
metrics: audit = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/v2-audit.json
metrics: dry = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/v2-dry.json
metrics: model = sh: python3 tools/ml/gate_metrics.py file var/ml/models/nights-1-3-eval.json
metrics: leaf = sh: python3 tools/ml/gate_metrics.py lines var/ml/gates/fit-v2/leaf-rows.jsonl
metrics: fit = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/fit-v2/report.json
metrics: cmp = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/v2-compare.json
headline: ds.rows, ds.games, audit.pass, fit.pass, cmp.better

Evaluator v2 (D364). Night 1's model (`var/ml/models/night-1-eval.json`, v1) passed gate 1 (J060); its
grid tried 7 of 1,440 configurations in 3 h. This job builds one dataset over nights 1-3 of the queue
(every cube, exploring games kept, D358), proves its split does not leak, answers "does more data still
help?" with a learning curve (and whether weighting every game equally helps), trains v2 with the
successive-halving search, runs gate 1 on v2 by D354's unchanged rule, and compares v2 with v1 on the
same held-out pairs (plain games; night 1's test pairs are the pre-registered subset, D364's rule).

**The split.** `--split-by pair` sends a deck pair to train, val or test by a hash of the pair alone,
so night 1's test pairs are test pairs of nights 1-3 and v1 never trained on a test pair of the new
dataset. `split_audit.py` checks it on the data and FAILS the job if a pair, draft folder or deck is in
two splits, or a night-1 game is missing or moved. The dataset uses night 1's own vocabulary
(`--vocab-from`), so v1 scores it (same schema id; the pilot checks).

**Memory, J060's envelope (9 GB).** Three nights are about three times night 1's 6.3 M rows. The fit
holds them with `--compact` (350 bytes a row against 621, measured; identical numbers: about 6.7 GB of
arrays for ~19 M rows), and before anything trains a dry
load at full size measures the peak with the workers (`peakWithWorkersGB`). One dry load with 4 workers
measures the load's peak and each worker's private peak; the curve and the search take the widest of
4..1 workers that stays under 8.5 GB (`v2-jobs.txt`), and the job stops there if even one does not.
Each worker runs one BLAS thread. `clean:` never names the dataset: a retry skips the encode.

Nothing here tunes on the test split. A FAIL of gate 1 or "not shown better" is a result, not a failed job.

## Pilot
metrics: numpy_ok = sh: python3 -c "import numpy; print(1)" 2>/dev/null || echo 0
metrics: night3 = sh: test -s var/cubelab/queue/night-3.json && echo 1 || echo 0
metrics: v1 = sh: python3 tools/ml/gate_metrics.py file var/ml/models/night-1-eval.json
metrics: n1 = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/night-1
metrics: pds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/gates/pilot-v2/data
metrics: same_schema = sh: python3 -c "import json; a=json.load(open('var/ml/gates/pilot-v2/data/stats.json'))['schemaId']; b=json.load(open('var/ml/models/night-1-eval.json'))['schemaId']; print(1 if a==b else 0)" 2>/dev/null || echo 0
metrics: pdry = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/v2-pilot-dry.json
metrics: pcmp = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/pilot-v2/compare.json
metrics: free_gb = sh: df -BG --output=avail var | tail -1 | tr -dc 0-9
check: numpy_ok == 1
check: night3 == 1
check: v1.exists == 1
check: n1.reservedChecked == 1
check: n1.rows >= 6000000
check: pds.written == 1
check: pds.reservedChecked == 1
check: pds.rows >= 1000
check: same_schema == 1
check: pdry.written == 1
check: pdry.peakWithWorkersGB < 2
check: pcmp.written == 1
check: free_gb >= 40
About 20 minutes, the whole chain at small size: the tests; a dataset of 60 seed folders over night 1's
vocabulary (its schema must be v1's); a dry load with 2 workers; a 2-share curve, a 5-configuration
search with 2 workers and v1 against the toy model, end to end.
```bash
python3 -m unittest tools/ml/tests/test_eval_v2.py tools/ml/tests/test_gates.py
P=var/ml/gates/pilot-v2; mkdir -p "$P" var/ml/reports
python3 tools/ml/dataset.py --vocab-from var/ml/data/night-1 --out "$P/data" --shard-rows 5000 --jobs {workers} \
    $(ls -d var/cubelab/queue/normal/*/games/* | awk 'NR % 97 == 1' | head -60)
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
python3 tools/ml/train_eval.py "$P/data" --split-by pair --compact --fast --search sha --configs 5 --jobs 2 \
    --batch 1024 --dry-load --report var/ml/reports/v2-pilot-dry.json
python3 tools/ml/train_eval.py "$P/data" --split-by pair --compact --fast --subsample 0.5 --curve 0.5,1.0 \
    --curve-weights none,game --epochs 3 --hidden 16 --jobs 2 --report "$P/curve.json"
python3 tools/ml/train_eval.py "$P/data" --split-by pair --compact --fast --subsample 0.5 --search sha --configs 5 \
    --min-epochs 1 --epochs 4 --patience 2 --jobs 2 --aux-turns 0.1 --out "$P/m.json" --report "$P/m-report.json"
python3 tools/ml/eval_compare.py "$P/data" --model "$P/m.json" --against var/ml/models/night-1-eval.json \
    --reference var/ml/data/night-1 --report "$P/compare.json"
```

## Commands
cores: 6
mem_gb: 9
```bash
mkdir -p var/ml/reports var/ml/models var/ml/gates/fit-v2
test -s var/ml/data/nights-1-3/stats.json || \
  python3 tools/ml/dataset.py --queue-root var/cubelab/queue --nights 1,2,3 --vocab-from var/ml/data/night-1 \
      --out var/ml/data/nights-1-3 --shard-rows 5000 --jobs {workers}
python3 tools/ml/split_audit.py var/ml/data/nights-1-3 --reference var/ml/data/night-1 --report var/ml/reports/v2-audit.json \
    | tee var/ml/reports/v2-audit.txt
```
cores: 6
mem_gb: 9
```bash
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
D=var/ml/data/nights-1-3
# one dry load at full size with 4 forked workers, each running a batch with every option the later
# blocks use (game weights, the auxiliary head, the per-epoch draw); the worker count is the widest of
# 4..1 whose load peak + workers x the largest worker's private peak (+10%) stays under 8.5 GB
python3 tools/ml/train_eval.py $D --split-by pair --compact --fast --subsample 0.25 --weight-by game --aux-turns 0.1 \
    --jobs 4 --hidden 128 --dim 4 --batch 4096 --dry-load --report var/ml/reports/v2-dry.json | tail -3
J=$(python3 -c "import json; r=json.load(open('var/ml/reports/v2-dry.json')); w=max(r.get('workersPrivateGB') or [0]); print(max([j for j in (4, 3, 2, 1) if r['peakGB'] + 1.1 * j * w < 8.5] or [0]))")
[ "$J" -gt 0 ] || { echo "dry load: over 8.5 GB even with 1 worker"; exit 1; }
echo "$J" > var/ml/reports/v2-jobs.txt
# does more data still help, and does weighting every game equally help? (one configuration: v1's winner)
python3 tools/ml/train_eval.py $D --split-by pair --compact --fast --subsample 0.25 --patience 24 --epochs 200 \
    --hidden 128 --dim 4 --batch 4096 --curve 0.25,0.5,1.0 --curve-weights none,game --jobs $J \
    --report var/ml/reports/v2-curve.json | tee var/ml/reports/v2-curve.txt
```
cores: 6
mem_gb: 9
```bash
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
D=var/ml/data/nights-1-3
J=$(cat var/ml/reports/v2-jobs.txt)
# v2: successive halving over the search space (GRID plus lower learning rates), 4 h; the base is v1's winner
python3 tools/ml/train_eval.py $D --split-by pair --compact --fast --subsample 0.25 --patience 24 --epochs 400 \
    --min-epochs 4 --hidden 128 --dim 4 --batch 4096 --aux-turns 0.1 --search sha --time-budget 14400 --jobs $J \
    --grid-log var/ml/reports/v2-search.jsonl --out var/ml/models/nights-1-3-eval.json \
    --report var/ml/reports/v2.json | tee var/ml/reports/v2.txt
```
cores: 1
mem_gb: 9
```bash
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
M2=var/ml/models/nights-1-3-eval.json; M1=var/ml/models/night-1-eval.json; F=var/ml/gates/fit-v2
python3 tools/ml/gate_fit.py heldout --model $M2 --out $F/heldout.txt
tools/ml/leaf-rows.sh --list $F/heldout.txt --model $M2 --out $F/leaf-rows.jsonl
tools/ml/leaf-rows.sh --list $F/heldout.txt --model $M1 --out $F/leaf-rows-v1.jsonl
python3 tools/ml/gate_fit.py score --compact --model $M2 --leaf-rows $F/leaf-rows.jsonl --report $F/report.json \
    | tee $F/verdict.txt || true
python3 tools/ml/eval_compare.py var/ml/data/nights-1-3 --model $M2 --against $M1 --reference var/ml/data/night-1 \
    --leaf-rows $F/leaf-rows.jsonl --against-leaf-rows $F/leaf-rows-v1.jsonl --report var/ml/reports/v2-compare.json \
    | tee var/ml/reports/v2-compare.txt
```
check: ds.reservedChecked == 1
check: ds.games >= 60000
check: audit.pass == 1
check: dry.written == 1
check: model.exists == 1
check: leaf.lines >= 1000
check: fit.written == 1
check: cmp.written == 1
check: cmp.testPairsTrainedOn_old == 0
check: cmp.testPairsTrainedOn_new == 0

## Abort if
abort: elapsed_s > 57600

## Report
collect: var/ml/data/nights-1-3/stats.json
collect: var/ml/reports/v2-audit.txt
collect: var/ml/reports/v2-dry.json
collect: var/ml/reports/v2-jobs.txt
collect: var/ml/reports/v2-curve.txt
collect: var/ml/reports/v2-curve.json
collect: var/ml/reports/v2.txt
collect: var/ml/reports/v2-search.jsonl
collect: var/ml/gates/fit-v2/verdict.txt
collect: var/ml/gates/fit-v2/report.json
collect: var/ml/reports/v2-compare.txt
collect: var/ml/reports/v2-compare.json

summary.md:
- the dataset: rows, games and deck pairs per split and per night (`stats.json` `nights`), exploring games
  kept, reserved games dropped; the split audit's line (PASS, night 1's games present and in place);
- memory: the dry load's peak with the workers and the worker count it chose (`v2-jobs.txt`), and the real
  run's `memory` lines;
- the learning curve: test log-loss per share with intervals, the step from 0.5 to 1.0 and its interval
  ("more data still helps" or not), the game-weighted minus unweighted difference at each share (by row
  and by game), and the effective sample size line;
- the search: configurations, rungs, the winner (hyperparameters, best epoch), whether the budget cut it,
  the auxiliary head's test MAE against the constant's, and the `held out` lines (plain vs exploring);
- gate 1 on v2: the verdict line and A, B, C, D with their numbers and intervals, and on a FAIL which clause;
- v2 against v1: each subset's line (all, reference = night 1's test pairs, new, exploring), the turn-end
  line, and the verdict ("BETTER" or "not shown better", D364's rule on the reference subset);
- the model's sha256 (12 hex).

Do not tune anything against the test split and do not rerun the gate with other settings. v2 replaces
v1 for gates 2 and 3 only if gate 1 passes on v2; whether to re-run gates 2 and 3 on v2 is Justin's call.
