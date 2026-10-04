id: J051
title: Evaluator gate 2: rank the set with the hand leaf and the evaluator at the live horizon, and score the regret (D354)
public_title: Regret gate scoring
public_est: ~30 min
cpu: heavy
after: J050
repos: mtg-table@7e48088 (main with the gates, #36, and the fit-memory fix, #45; pinned so the truth and the rankers share one code version, D341)
decides: promote evaluator v1 past gate 2 (D354), and so whether J052's SPRT runs
hypothesis: the evaluator's leaf has lower regret than the hand leaf at the live horizon, because it beat the hand leaf on held-out log-loss in gate 1 (J060: +0.066 [0.052, 0.079])
rule: gates.py REGRET_RULE (D354 gate 2): PASS when mean regret(hand) - regret(eval) > 0 and its paired bootstrap 95% interval excludes 0, on >= 240 scored decisions
followup: jobs/J052-evaluator-sprt.md
est: ~20-40 min (about 40k end-of-turn playouts at ~0.1 s on 7 JVMs, plus JVM boots)
resumable: yes
max_workers: 7
mem_per_worker_gb: 2.5
timeout: 4h
progress: lines var/ml/gates/regret/rank-eval-3.jsonl.shard-*.jsonl of 300
metrics: set = sh: python3 tools/ml/gate_metrics.py lines var/ml/gates/regret/set.jsonl
metrics: re3 = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/regret/rank-eval-3.jsonl var/ml/gates/regret/set.jsonl
metrics: rh12 = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/regret/rank-hand-12.jsonl var/ml/gates/regret/set.jsonl
metrics: re12 = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/regret/rank-eval-12.jsonl var/ml/gates/regret/set.jsonl
metrics: g2 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/regret/report.json
headline: g2.scored, g2.regretHand, g2.regretEval, g2.diffHandMinusEval_estimate, g2.diffHandMinusEval_lo, g2.pass

Gate 2's verdict (D354). The job ranks every decision of J050's set by the same rollouts to
the end of THIS turn (the search's live horizon, 3 rounds, seed 1), scored two ways:
- by the hand leaf through σ(leaf/500) (done in J050's screen);
- by J049's evaluator (`--leaf eval:`).

It then computes each ranker's regret against J050's truth tables. PASS when the mean of
regret(hand) - regret(eval) is above 0 and its paired bootstrap 95% interval over decisions
excludes 0, on at least 240 scored decisions. The 12-round rankers are reported, not gated.

## Pilot
About 3 minutes: the evaluator ranker on three decisions of the set.
```bash
./bridge/build.sh
P=var/ml/gates/pilot-score; rm -rf "$P"; mkdir -p "$P"
head -3 var/ml/gates/regret/set.jsonl > "$P/three.jsonl"
python3 tools/ml/gate_regret_grade.py rank --leaf eval:var/ml/models/night-1-eval.json --requests "$P/three.jsonl" \
    --out "$P/rank-eval-3.jsonl" --jobs 1 --name pilot-score
```
metrics: prank = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/pilot-score/rank-eval-3.jsonl var/ml/gates/pilot-score/three.jsonl
check: prank.answered == 3
check: prank.ok >= 2
check: prank.refused == 0

Broken-or-not only: the model loads in the grader and its answers come back `ok`.

## Commands
```bash
R=var/ml/gates/regret; M=var/ml/models/night-1-eval.json
python3 tools/ml/gate_regret_grade.py rank --leaf eval:$M --requests "$R/set.jsonl" --out "$R/rank-eval-3.jsonl" --jobs {workers}
python3 tools/ml/gate_regret_grade.py rank --leaf hand --rounds 12 --requests "$R/set.jsonl" --out "$R/rank-hand-12.jsonl" --jobs {workers}
python3 tools/ml/gate_regret_grade.py rank --leaf eval:$M --rounds 12 --requests "$R/set.jsonl" --out "$R/rank-eval-12.jsonl" --jobs {workers}
python3 tools/ml/gate_regret_score.py --set "$R/set.jsonl" --truth "$R/truth.jsonl" --hand "$R/rank-hand-3.jsonl" \
    --eval "$R/rank-eval-3.jsonl" --hand2 "$R/rank-hand-12.jsonl" --eval2 "$R/rank-eval-12.jsonl" \
    --report "$R/report.json" | tee "$R/verdict.txt" || true
```
check: re3.answered == set.lines
check: re12.answered == set.lines
check: rh12.answered == set.lines
check: g2.written == 1
check: g2.scored >= 1

## Abort if
abort: re3.answered >= 30 and re3.error > re3.answered / 5

## Report
collect: var/ml/gates/regret/verdict.txt
collect: var/ml/gates/regret/report.json

summary.md:
- gate 2's verdict line;
- mean regret for hand, eval and Forge's own choice;
- the paired difference with its interval;
- the per-type table and pick agreement;
- the 12-round secondary;
- the unscored decisions and why.

A FAIL stops the evaluator here: J052's pilot checks gates 1 and 2 and will not start the SPRT.
