
# Coach bench — A main-r10 → B hidden-rule-r10

**Verdict: No detectable difference between A (main-r10) and B (hidden-rule-r10): the 95% interval of the mean score difference includes zero.**

Paired over 28 cases (10 vs 10 answers per case). Mean score difference (B − A) +0.03 [−0.01, +0.09]; total +0.80 [−0.20, +2.50]. Cases better 2, worse 1, unchanged 25; sign test p = 1.000.

Quality score A 0.93 [0.85, 1.00] · B 0.96 [0.90, 1.00]
Acceptable A 95% [87%, 100%] · B 96% [90%, 100%]
Blunder A 1% [0%, 4%] · B 0% [0%, 0%]
Format failures A 0% [0%, 1%] · B 0% [0%, 1%] (the coach answered badly; separate from the score)
Transport errors A 0 of 280 · B 0 of 280 calls (no answer at all; separate from both)
Median latency per answer 6.6 s → 7.1 s

## Flips beyond noise: better (0)

## Flips beyond noise: worse (0)

_A flip is flagged only when every valid answer of one run scores above every valid answer of the other, with 2+ answers in each._

## Unstable cases (agreement below 0.67) (4)
- attack-ability42-flier-and-quake (attack): B 60%
- block-comfort13-trade-fliers (block): B 60%
- block-trample7-first-strike (block): A 60%, B 50%
- spell-auto2026-turn2 (spell): A 60%

## Per-case difference (B − A), cases that differ

| case | type | A mean | B mean | diff |
|---|---|---:|---:|---:|
| spell-auto2026-turn2 | spell | +0.20 | +1.00 | +0.80 |
| attack-ability42-flier-and-quake | attack | +0.20 | +0.30 | +0.10 |
| block-comfort13-trade-fliers | block | +0.70 | +0.60 | −0.10 |

