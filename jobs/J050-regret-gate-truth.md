id: J050
title: Evaluator gate 2: the decision set and its full-game truth tables (D354), resumable
public_title: Regret gate truth grading
public_est: ~one night
cpu: heavy
after: J060
repos: mtg-table@7e48088 (main with the gates, #36, and the fit-memory fix, #45; pinned so the truth and the rankers share one code version, D341)
est: one night: ~300 decisions x ~5 options x 200 rounds x 0.6 (racing) = ~180k full-game playouts at 0.5-1.0 s = 25-50 core-hours, 4-7 h on 7 JVMs; the screen about 10 min
resumable: yes
max_workers: 7
mem_per_worker_gb: 2.5
timeout: 16h
progress: lines var/ml/gates/regret/truth.jsonl.shard-*.jsonl of 300
metrics: set = sh: python3 tools/ml/gate_metrics.py lines var/ml/gates/regret/set.jsonl
metrics: screen = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/regret/rank-hand-3.jsonl var/ml/gates/regret/candidates.jsonl
metrics: truth = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/regret/truth.jsonl var/ml/gates/regret/set.jsonl
headline: set.lines, truth.answered, truth.ok, truth.error, truth.playouts

Gate 2 of the evaluator (D354), the expensive half. The job builds the fixed decision set:
- decisions the AI seats took in J029's lab games, with decision records;
- normal drafts only, held-out deck pairs of J049's model only, reserved decks dropped;
- stratified 100 spell / 100 attack / 100 block, chosen in a fixed hash order after a rebuild
  screen.

It then grades every decision to the END of the game: 200 rounds with racing, seed 20261004,
through `coach-grade.sh serve` in the live hidden-information mode. The cube list is the
opponent's pool, and the opponent's deck list is never sent (D348). These are the truth
tables. They do not depend on the model and are reused for every later leaf.

Resumable: a restart skips every decision already answered, and each JVM writes per decision.
The job runs whatever gate 1 said.

## Pilot
About 10-15 minutes: the set's candidates, a rebuild screen of six, and two truth gradings.
```bash
./bridge/build.sh
P=var/ml/gates/pilot-regret; rm -rf "$P"; mkdir -p "$P"
python3 tools/ml/gate_regret_build.py candidates --model var/ml/models/night-1-eval.json --logs var/cubelab/queue \
    --out "$P/candidates.jsonl"
head -6 "$P/candidates.jsonl" > "$P/six.jsonl"
python3 tools/ml/gate_regret_grade.py rank --leaf hand --requests "$P/six.jsonl" --out "$P/rank-hand-3.jsonl" --jobs 2 --name pilot-rank
head -2 "$P/six.jsonl" > "$P/two.jsonl"
python3 tools/ml/gate_regret_grade.py truth --requests "$P/two.jsonl" --out "$P/truth.jsonl" --jobs 2 --name pilot-truth
```
metrics: pc = sh: python3 tools/ml/gate_metrics.py lines var/ml/gates/pilot-regret/candidates.jsonl
metrics: prank = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/pilot-regret/rank-hand-3.jsonl var/ml/gates/pilot-regret/six.jsonl
metrics: ptruth = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/pilot-regret/truth.jsonl var/ml/gates/pilot-regret/two.jsonl
check: pc.lines >= 240
check: prank.answered == 6
check: prank.ok >= 3
check: prank.refused == 0
check: ptruth.answered == 2
check: ptruth.ok >= 1
check: ptruth.refused == 0

Broken-or-not only:
- there are enough held-out candidates for a 300-decision set;
- the screen answers;
- the end-of-game grading finishes;
- D348's guard refuses nothing, which would mean an opponent deck list was sent.

The pilot sets no timing bound: the truth's cost is what this job measures.

## Commands
```bash
R=var/ml/gates/regret; mkdir -p "$R"
python3 tools/ml/gate_regret_build.py candidates --model var/ml/models/night-1-eval.json --logs var/cubelab/queue \
    --out "$R/candidates.jsonl"
python3 tools/ml/gate_regret_grade.py rank --leaf hand --requests "$R/candidates.jsonl" --out "$R/rank-hand-3.jsonl" --jobs {workers}
python3 tools/ml/gate_regret_build.py select --candidates "$R/candidates.jsonl" --screen "$R/rank-hand-3.jsonl" --out "$R/set.jsonl"
python3 tools/ml/gate_regret_grade.py truth --requests "$R/set.jsonl" --out "$R/truth.jsonl" --jobs {workers}
```
check: set.lines >= 240
check: truth.answered == set.lines
check: truth.ok >= set.lines * 0.8
check: truth.refused == 0

## Abort if
abort: truth.answered >= 30 and truth.error > truth.answered / 5
abort: truth.refused > 0

## Report
collect: var/ml/gates/regret/manifest.json
collect: var/ml/gates/regret/set.jsonl
collect: var/ml/gates/regret/truth.jsonl.meta.json

summary.md:
- the set per type, and the screen's statuses;
- the truth's answers by status, the playouts in all, and the median and p90 `wallMs` per
  decision;
- how many decisions hit the 40-minute cap (`stop`);
- the version stamp (bridge tree, jar).

If the job stopped part-way, say how many decisions are done. Rerunning the job resumes it.
