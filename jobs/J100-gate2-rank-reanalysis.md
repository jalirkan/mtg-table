id: J100
title: Gate 2's truth read over every option (D395): pairwise ordering accuracy, rank correlations and a discordant sign test for the hand leaf against evaluators v1 and v2 on J050's truth tables; no playouts
public_title: Gate 2 rank re-analysis
public_est: ~20 min
cpu: heavy
cores: 1
after: J081
repos: mtg-table@fd1c91d (main with tools/ml/regret_rank.py, D395; it only reads answer files, so the bridge tree does not matter here; the answers' own version stamps are compared by the script)
decides: whether the evaluator-as-leaf track restarts (the outside review's T2, a discordance-enriched gate 2) or stays stopped
hypothesis: v2's leaf orders a decision's options no better than the hand leaf (the outside review, section 2.1: the evaluator's log-loss gain is mostly between-game signal, which cancels inside a decision)
rule: D395 RANK_RULE (regret_rank.py), written before any real table was read with it: the evaluator has a within-decision edge when the mean over decisions of pairwise ordering accuracy, eval minus hand, has a 95% paired bootstrap interval (10,000 resamples of decisions, seed 20261004) whose lower end is above 0, on >= 240 decisions; read on v2 at 3 rounds (J081's regret-v2/rank-eval-3.jsonl against J050's rank-hand-3.jsonl); v1 and the 12-round tables are reported without a verdict. No edge: the leaf track stays stopped (no rollout-label nights, no T2). An edge: T2 is worth posting; REGRET_RULE's gate-2 FAILs stand either way
est: ~10-20 min (four readings of 291 decisions, each about a minute of pure-Python bootstraps; the inputs are a few MB)
resumable: no
max_workers: 1
mem_per_worker_gb: 1
timeout: 2h
clean: var/ml/gates/rank-reanalysis
metrics: inp = sh: python3 -c "import sys, json; sys.path.insert(0, 'tools/ml'); import gates as G; R='var/ml/gates/regret/'; V='var/ml/gates/regret-v2/'; ok=lambda p: len({str(a.get('id')) for a in G.read_jsonl(p) if a.get('status') == 'ok'}); print(json.dumps({'setSha': 1 if G.file_sha(R + 'set.jsonl') == '032a747058d1ad25e8facb7e50b3e60ce3d0daeee9244c9a7e999734a1c294f9' else 0, 'truth': ok(R + 'truth.jsonl'), 'hand3': ok(R + 'rank-hand-3.jsonl'), 'hand12': ok(R + 'rank-hand-12.jsonl'), 'v1e3': ok(R + 'rank-eval-3.jsonl'), 'v1e12': ok(R + 'rank-eval-12.jsonl'), 'v2e3': ok(V + 'rank-eval-3.jsonl'), 'v2e12': ok(V + 'rank-eval-12.jsonl')}))" 2>/dev/null || echo '{"setSha":0}'
metrics: r2 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/rank-reanalysis/v2-3.json
metrics: r1 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/rank-reanalysis/v1-3.json
metrics: s2 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/rank-reanalysis/v2-12.json
metrics: s1 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/rank-reanalysis/v1-12.json
headline: r2.decisions, r2.pairwise_hand, r2.pairwise_eval, r2.pairwise_diff_estimate, r2.pairwise_diff_lo, r2.pairwise_diff_hi, r2.sign_discordant, r2.edge

Zero-compute re-analysis of gate 2 (D354), the outside review's T1. J050 graded 291 decisions to the end of
the game (233,204 playouts). J051 (v1) and J081 (v2) scored each ranker only by the truth's win rate of
the ONE option it picks. Both rankers pick the same option on about 75% of decisions, so the regret test
reads about 70 discordant decisions.

Every answer file keeps every option's `winRate` and `n` (and the truth's 95% interval). This job reads
them again, ranks nothing and plays nothing. The question is whether the evaluator **orders** all of a
decision's options better than the hand leaf.

**Inputs (only read):**
- `var/ml/gates/regret/`, from J050 and J051: `set.jsonl` (sha256 032a7470…94f9), `truth.jsonl`,
  `rank-hand-3.jsonl`, `rank-hand-12.jsonl`, and v1's `rank-eval-3.jsonl` and `rank-eval-12.jsonl`.
- `var/ml/gates/regret-v2/`, from J081: v2's `rank-eval-3.jsonl` and `rank-eval-12.jsonl`.

The `.meta.json` stamps are compared: tables graded by different bridge trees or jars are refused. All of
them are at 7e48088's tree dc7c308, which J081's pilot checked.

**What it computes** (`tools/ml/regret_rank.py`, per decision, over the options all three tables share):
- pairwise ordering accuracy over every pair whose truth differs: 1 when ordered right, ½ when the ranker
  ties the pair, 0 when it reverses it;
- the same over the truth's *confident* pairs only (beyond 1.96 SE);
- Spearman's rho and Kendall's tau-b of the ranker's means against the truth;
- for each of these, eval − hand averaged over decisions, with a paired bootstrap interval;
- the discordant-only sign test (eval better / hand better / equal, exact binomial p; also for clear
  differences only);
- the truth's noise: playouts per option for the best, active and retired options; per-option SE; the
  share of pairs the truth cannot tell apart; the within-decision reliability 1 − mean(se²)/var(truth);
  each ranker's regret SE;
- everything split by stratum (attack, block, spell) and by option count (2, 3–4, 5–8, 9+).

**Multiple looks.** This is the third reading of J050's set. It asks a different question (the ordering,
not the pick) under a rule written before the run, with one model named for the verdict (v2 at 3 rounds).
v1 and the 12-round tables are descriptive only. The script itself refuses a verdict on tables ranked at
other rounds.

**Re-posted as J100 (2026-10-06):** J097's pilot refused on `inp.hand3 = 344`. J050's `rank-hand-3.jsonl` answers a superset of the 291-decision set, and `regret_rank.py` reads only the set's ids (`analyse` iterates the set), so the check is now `>= 291`. `r2.decisions >= 240` still guards coverage.

## Pilot
About 1 minute: the script's tests, the inputs intact and complete, and the same command on the first 30
decisions of the set (which must read 30 and give NO EDGE, as under 240).
```bash
python3 -m unittest tools/ml/tests/test_regret_rank.py
P=var/ml/gates/rank-reanalysis/pilot; mkdir -p "$P"
head -30 var/ml/gates/regret/set.jsonl > "$P/set30.jsonl"
python3 tools/ml/regret_rank.py --set "$P/set30.jsonl" --truth var/ml/gates/regret/truth.jsonl \
    --hand var/ml/gates/regret/rank-hand-3.jsonl --eval var/ml/gates/regret-v2/rank-eval-3.jsonl \
    --label v2-pilot --report "$P/v2-3.json"
```
metrics: pr = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/rank-reanalysis/pilot/v2-3.json
check: inp.setSha == 1
check: inp.truth == 291 and inp.hand3 >= 291 and inp.hand12 == 291
check: inp.v1e3 == 291 and inp.v1e12 == 291 and inp.v2e3 == 291 and inp.v2e12 == 291
check: pr.written == 1 and pr.decisions == 30 and pr.edge == 0 and pr.ruled == 1

## Commands
```bash
R=var/ml/gates/regret; V=var/ml/gates/regret-v2; O=var/ml/gates/rank-reanalysis
mkdir -p "$O"
sha256sum "$R/set.jsonl" "$R/truth.jsonl" "$R/rank-hand-3.jsonl" "$R/rank-hand-12.jsonl" "$R/rank-eval-3.jsonl" \
    "$R/rank-eval-12.jsonl" "$V/rank-eval-3.jsonl" "$V/rank-eval-12.jsonl" > "$O/inputs.sha256"
# the rule's reading: v2 at 3 rounds
python3 tools/ml/regret_rank.py --set "$R/set.jsonl" --truth "$R/truth.jsonl" --hand "$R/rank-hand-3.jsonl" \
    --eval "$V/rank-eval-3.jsonl" --label v2 --report "$O/v2-3.json" | tee "$O/v2-3.txt"
# descriptive: v1 at 3 rounds, and both at 12 rounds (the script gives these no verdict)
python3 tools/ml/regret_rank.py --set "$R/set.jsonl" --truth "$R/truth.jsonl" --hand "$R/rank-hand-3.jsonl" \
    --eval "$R/rank-eval-3.jsonl" --label v1 --report "$O/v1-3.json" | tee "$O/v1-3.txt"
python3 tools/ml/regret_rank.py --set "$R/set.jsonl" --truth "$R/truth.jsonl" --hand "$R/rank-hand-12.jsonl" \
    --eval "$V/rank-eval-12.jsonl" --label v2-12 --report "$O/v2-12.json" | tee "$O/v2-12.txt"
python3 tools/ml/regret_rank.py --set "$R/set.jsonl" --truth "$R/truth.jsonl" --hand "$R/rank-hand-12.jsonl" \
    --eval "$R/rank-eval-12.jsonl" --label v1-12 --report "$O/v1-12.json" | tee "$O/v1-12.txt"
```
check: r2.written == 1 and r2.ruled == 1
check: r2.decisions >= 240
check: r1.written == 1 and s2.written == 1 and s1.written == 1
check: s2.ruled == 0 and s1.ruled == 0

`r2.edge` is the finding, not a check: NO EDGE is a result, and the job ends `done` either way. The
scorer's `regretHand` / `regretEval` must equal J081's report (0.0208 / 0.0217 for v2) and J051's (0.0208 /
0.0192 for v1). A mismatch means the options were joined differently: say so in the summary.

## Abort if
abort: elapsed_s > 5400

## Report
collect: var/ml/gates/rank-reanalysis/v2-3.txt
collect: var/ml/gates/rank-reanalysis/v2-3.json
collect: var/ml/gates/rank-reanalysis/v1-3.txt
collect: var/ml/gates/rank-reanalysis/v1-3.json
collect: var/ml/gates/rank-reanalysis/v2-12.txt
collect: var/ml/gates/rank-reanalysis/v2-12.json
collect: var/ml/gates/rank-reanalysis/v1-12.txt
collect: var/ml/gates/rank-reanalysis/v1-12.json
collect: var/ml/gates/rank-reanalysis/inputs.sha256

summary.md, plainly:
- the rule's line for v2 at 3 rounds (EDGE or NO EDGE, and why): pairwise accuracy for hand and eval, with
  eval − hand and its interval and n; the next line names the consequence (leaf track stays stopped, or
  T2 is worth posting);
- for v2 and v1, side by side: pairwise accuracy, confident-pair accuracy, Spearman and Kendall (hand, eval,
  difference with interval);
- the discordant sign test for v2 and v1 (eval better : hand better : equal, p; then the clear-only counts);
- the truth's noise: total playouts; median, p10 and p90 playouts per option; best vs retired; median SE
  (best and all); the share of indistinguishable pairs; median reliability; the regret SEs beside the mean
  regrets;
- the by-stratum and by-option-count tables for v2 (pairwise accuracy hand, eval and difference; Spearman;
  discordant counts), and a line on the two-option decisions;
- the 12-round readings in one line each (descriptive);
- the regret cross-check against J081 and J051.
Never write "no gain". Write "no within-decision edge shown at this power", with the interval.
