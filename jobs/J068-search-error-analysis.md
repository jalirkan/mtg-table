id: J068
title: Search error analysis: where the search AI loses, by kind, turn, cube and card, judged by gate 2's truth tables (D367)
public_title: Search error analysis
public_est: ~1 h
cpu: heavy
after: J051
repos: mtg-table@9cf9538 (main with the search error analysis, PR #53, D367)
est: ~20-60 min on one core (reading the recorded logs' headers and the search seats' games, 2,000-resample bootstraps)
resumable: no
max_workers: 1
cores: 1
mem_per_worker_gb: 2
timeout: 4h
clean: var/analysis/search-errors-1 var/analysis/pilot-search-errors
metrics: ea = sh: cat var/analysis/search-errors-1/summary.json
headline: ea.searched, ea.noiseDecisions, ea.truthRows, ea.regret_truth_mean, ea.ranker_argmax_differ, ea.ranker_argmax_harmful, ea.lostGames

Three search tweaks were SPRT-tested on hunches and none gained (attack horizon `aturns=1`,
the oracle, the LCB override). This job reads what the lab already holds and writes an error
analysis (D367), so the next search change aims at a real failure mode:

- gate 2's set, full-game truth tables (J050) and the hand rankers at 3 and 12 rounds (J051):
  the hand ranker at 3 rounds is search-v1-fixed3's ranking without its margin rule, so the
  truth judges the search against Forge on every decision of the set;
- decision records (D347) of every recorded game whose seat played the search: J048's bench
  games, any lab run with search seats, and the queue (only its search seats are read);
- the AI ladder's results and SPRT lines (`var/ai-ladder`): each SPRT's score by cube, game
  length and seat. Ladder batches are not recorded, so their losses have no frames;
- J049's evaluator, for the win-chance trajectory of each lost recorded search game.

No engine runs: Python only, one process.

## Pilot
About a minute: the committed fixture, then the real inputs capped at 20 logs.
```bash
P=var/analysis/pilot-search-errors; rm -rf "$P"
python3 tools/ml/search_errors.py --name pilot-fixture --out "$P/fixture" --logs fixtures/cubelab/decisions --policy any
python3 tools/ml/search_errors.py --name pilot --out "$P/real" --max-games 20 \
    --logs var/ai-bench --logs var/cubelab/runs \
    --truth-set var/ml/gates/regret/set.jsonl --truth var/ml/gates/regret/truth.jsonl \
    --rank3 var/ml/gates/regret/rank-hand-3.jsonl --rank12 var/ml/gates/regret/rank-hand-12.jsonl \
    --ladder var/ai-ladder
```
metrics: pfx = sh: cat var/analysis/pilot-search-errors/fixture/summary.json
metrics: preal = sh: cat var/analysis/pilot-search-errors/real/summary.json
check: pfx.written == 1
check: pfx.searched == 20
check: pfx.noiseDecisions == 20
check: preal.written == 1
check: preal.truthRows >= 1

Broken-or-not only: the tool runs on the PC's Python, reads the committed recording as the
tests do, and joins gate 2's truth tables to their logs.

## Commands
```bash
O=var/analysis/search-errors-1
python3 tools/ml/search_errors.py --name search-errors-1 --out "$O" \
    --logs var/ai-bench --logs var/cubelab/runs --logs var/cubelab/queue --max-games 4000 \
    --truth-set var/ml/gates/regret/set.jsonl --truth var/ml/gates/regret/truth.jsonl \
    --rank3 var/ml/gates/regret/rank-hand-3.jsonl --rank12 var/ml/gates/regret/rank-hand-12.jsonl \
    --ladder var/ai-ladder --model var/ml/models/night-1-eval.json
```
check: ea.written == 1
check: ea.truthRows >= 200
check: ea.ladderGames >= 1

## Abort if
(none: one process, no games played; the timeout bounds it)

## Report
collect: var/analysis/search-errors-1/report.md
collect: var/analysis/search-errors-1/summary.json
collect: var/analysis/search-errors-1/manifest.json
collect: var/analysis/search-errors-1/tables/regret_by.csv
collect: var/analysis/search-errors-1/tables/disagreement_summary.csv
collect: var/analysis/search-errors-1/tables/noise_summary.csv
collect: var/analysis/search-errors-1/tables/budget.csv
collect: var/analysis/search-errors-1/tables/cards.csv
collect: var/analysis/search-errors-1/tables/card_tags.csv
collect: var/analysis/search-errors-1/tables/forensics.csv
collect: var/analysis/search-errors-1/tables/ladder.csv

summary.md:
- the regret table by kind and by turn bucket (truth source), with Forge's regret on the same
  decisions;
- the search against Forge: decisions where the ranker differs from Forge, the helped and
  harmful counts and rates with intervals, per kind; the same for the margin rule;
- the noise: the share of searched decisions within noise, mean P(worse), and the 3-vs-12
  round flip rate with which pick the truth preferred;
- the top 10 cards and the tag table by total regret;
- loss forensics: the lost recorded games, the turn buckets of the largest falls and the
  decision kinds there; each SPRT's score by cube;
- the counts of what was left out, and why.

Report the numbers as the report gives them, intervals included. Do not name a failure mode
whose interval includes zero as one.
