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

