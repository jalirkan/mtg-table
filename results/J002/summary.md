# J002 — PR #27 coach-bench comparison, one question at a time

Pilot: skipped as the job allows (the rerun had already started). Checked instead against the job's rules: transport errors 0 of 168 answers, format failures 0 of 168, every case has 3 valid answers in both runs.

## Verdict

**No detectable difference** between the pre-fix prompt and main: mean score difference +0.01 [+0.00, +0.04] over 28 paired cases; 1 case better, 0 worse, 27 unchanged; sign test p = 1.000. Blunders 0% in both. Median latency 10.6 s → 9.9 s. The set is near its ceiling (acceptable 95% → 96%), so it cannot separate the two prompts; see the regret-grading proposal.

Transport errors (helper busy / network): **0**. Format failures: **0** in both runs. (The earlier --concurrency 2 runs, 2026-10-03T13-14-57Z-baseline-r3 and 13-19-09Z-after-fixes-r3, had 69-70% transport errors from the helper's 429 and are not included.)

## Full --compare output

# Coach bench — A baseline-r3c → B after-fixes-r3c

**Verdict: No detectable difference between A (baseline-r3c) and B (after-fixes-r3c): the 95% interval of the mean difference includes zero.**

Paired over 28 cases (3 vs 3 answers per case). Mean score difference (B − A) +0.01 [+0.00, +0.04]; total +0.33 [+0.00, +1.00]. Cases better 1, worse 0, unchanged 27; sign test p = 1.000.

Quality score A 0.95 [0.86, 1.00] · B 0.96 [0.89, 1.00]
Acceptable A 95% [86%, 100%] · B 96% [89%, 100%]
Blunder A 0% [0%, 0%] · B 0% [0%, 0%]
Format failures A 0% [0%, 4%] · B 0% [0%, 4%] (separate from the score)
Median latency per answer 10.6 s → 9.9 s

## Flips beyond noise: better (0)

## Flips beyond noise: worse (0)

_A flip is flagged only when every valid answer of one run scores above every valid answer of the other, with 2+ answers in each._

## Unstable cases (agreement below 0.67) (4)
- block-auto7-must-block (block): A 67%
- block-comfort13-trade-fliers (block): A 67%
- block-trample7-first-strike (block): B 67%
- spell-yield13-turn1 (spell): A 67%

## Per-case difference (B − A), cases that differ

| case | type | A mean | B mean | diff |
|---|---|---:|---:|---:|
| block-comfort13-trade-fliers | block | +0.67 | +1.00 | +0.33 |


## Run summaries

### baseline-r3c (bench/pre-prompt-fixes aa9c687)
# Coach bench — baseline-r3c

2026-10-03T13:24:19.643Z · source: helper · model: claude-sonnet-5-5 · 3 answers per case

**Quality score 0.95 [0.86, 1.00]** (mean over 28 cases, −1 to +1, 95% interval by bootstrap over cases) · acceptable 95% [86%, 100%] · blunder 0% [0%, 0%]

Format failures (missing, illegal or errored answers; not in the score): 0% [0%, 4%] of 84 answers (Wilson interval)

Unstable cases (agreement below 0.67): 3 of 28

Latency per answer: mean 10.6 s, median 10.6 s, p90 14.8 s, max 20.1 s


| type | cases | score (95%) | acceptable | blunder | format fail | unstable |
|---|---:|---|---:|---:|---:|---:|
| mulligan | 4 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |
| play_draw | 2 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |
| spell | 5 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 1 |
| attack | 4 | 0.75 [0.25, 1.00] | 75% | 0% | 0% | 0 |
| block | 5 | 0.93 [0.80, 1.00] | 93% | 0% | 0% | 2 |
| target | 3 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |
| pass | 3 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |
| choice | 2 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |

| case | type | mean | ok / blunder / other / format | agree | answers seen |
|---|---|---:|---|---:|---|
| attack-ability42-flier-and-quake | attack | +0.00 | 0 / 0 / 3 / 0 | 100% | attack:25×3 |
| attack-comfort13-hold-flier-home | attack | +1.00 | 3 / 0 / 0 / 0 | 100% | attack:none×3 |
| attack-trample7-alpha | attack | +1.00 | 3 / 0 / 0 / 0 | 100% | attack:21,22,26,32,34×3 |
| attack-trample7-no-blockers | attack | +1.00 | 3 / 0 / 0 / 0 | 100% | attack:21,26,34×3 |
| block-auto7-must-block | block | +1.00 | 3 / 0 / 0 / 0 | 67% | block:4>42,26>42×2, block:4>42×1 |
| block-comfort13-must-block | block | +1.00 | 3 / 0 / 0 / 0 | 100% | block:23>64,30>70,31>71×3 |
| block-comfort13-trade-fliers | block | +0.67 | 2 / 0 / 1 / 0 | 67% | block:23>64×2, block:none×1 |
| block-number7-hellion | block | +1.00 | 3 / 0 / 0 / 0 | 100% | block:33>55×3 |
| block-trample7-first-strike | block | +1.00 | 3 / 0 / 0 / 0 | 100% | block:21>49,26>49×3 |
| choice-comfort13-thriving-colour | choice | +1.00 | 3 / 0 / 0 / 0 | 100% | option:3×3 |
| choice-number7-hellion-damage | choice | +1.00 | 3 / 0 / 0 / 0 | 100% | option:0×3 |
| mulligan-comfort13-two-lands-on-draw | mulligan | +1.00 | 3 / 0 / 0 / 0 | 100% | keep×3 |
| mulligan-number7-four-lands | mulligan | +1.00 | 3 / 0 / 0 / 0 | 100% | keep×3 |
| mulligan-trample7-curve | mulligan | +1.00 | 3 / 0 / 0 / 0 | 100% | keep×3 |

### after-fixes-r3c (main 39eb318)
# Coach bench — after-fixes-r3c

2026-10-03T13:39:13.780Z · source: helper · model: claude-sonnet-5-5 · 3 answers per case

**Quality score 0.96 [0.89, 1.00]** (mean over 28 cases, −1 to +1, 95% interval by bootstrap over cases) · acceptable 96% [89%, 100%] · blunder 0% [0%, 0%]

Format failures (missing, illegal or errored answers; not in the score): 0% [0%, 4%] of 84 answers (Wilson interval)

Unstable cases (agreement below 0.67): 1 of 28

Latency per answer: mean 10.3 s, median 9.9 s, p90 14.4 s, max 24.0 s


| type | cases | score (95%) | acceptable | blunder | format fail | unstable |
|---|---:|---|---:|---:|---:|---:|
| mulligan | 4 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |
| play_draw | 2 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |
| spell | 5 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |
| attack | 4 | 0.75 [0.25, 1.00] | 75% | 0% | 0% | 0 |
| block | 5 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 1 |
| target | 3 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |
| pass | 3 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |
| choice | 2 | 1.00 [1.00, 1.00] | 100% | 0% | 0% | 0 |

| case | type | mean | ok / blunder / other / format | agree | answers seen |
|---|---|---:|---|---:|---|
| attack-ability42-flier-and-quake | attack | +0.00 | 0 / 0 / 3 / 0 | 100% | attack:25×3 |
| attack-comfort13-hold-flier-home | attack | +1.00 | 3 / 0 / 0 / 0 | 100% | attack:none×3 |
| attack-trample7-alpha | attack | +1.00 | 3 / 0 / 0 / 0 | 100% | attack:21,22,26,32,34×3 |
| attack-trample7-no-blockers | attack | +1.00 | 3 / 0 / 0 / 0 | 100% | attack:21,26,34×3 |
| block-auto7-must-block | block | +1.00 | 3 / 0 / 0 / 0 | 100% | block:4>42,26>42×3 |
| block-comfort13-must-block | block | +1.00 | 3 / 0 / 0 / 0 | 100% | block:23>64,30>70,31>71×3 |
| block-comfort13-trade-fliers | block | +1.00 | 3 / 0 / 0 / 0 | 100% | block:23>64×3 |
| block-number7-hellion | block | +1.00 | 3 / 0 / 0 / 0 | 100% | block:33>55×3 |
| block-trample7-first-strike | block | +1.00 | 3 / 0 / 0 / 0 | 67% | block:21>49,26>49×2, block:26>49,34>49×1 |
| choice-comfort13-thriving-colour | choice | +1.00 | 3 / 0 / 0 / 0 | 100% | option:3×3 |
| choice-number7-hellion-damage | choice | +1.00 | 3 / 0 / 0 / 0 | 100% | option:0×3 |
| mulligan-comfort13-two-lands-on-draw | mulligan | +1.00 | 3 / 0 / 0 / 0 | 100% | keep×3 |
| mulligan-number7-four-lands | mulligan | +1.00 | 3 / 0 / 0 / 0 | 100% | keep×3 |
| mulligan-trample7-curve | mulligan | +1.00 | 3 / 0 / 0 / 0 | 100% | keep×3 |
