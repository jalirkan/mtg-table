
# Coach bench — A old-prompt-r10 → B new-prompt-r10

**Verdict: B (new-prompt-r10) is worse than A (old-prompt-r10): the 95% interval of the mean score difference excludes zero.**

Paired over 28 cases (10 vs 10 answers per case). Mean score difference (B − A) −0.02 [−0.04, −0.00]; total −0.50 [−1.00, −0.10]. Cases better 0, worse 4, unchanged 24; sign test p = 0.125.

Quality score A 0.95 [0.87, 1.00] · B 0.93 [0.84, 1.00]
Acceptable A 95% [87%, 100%] · B 94% [84%, 100%]
Blunder A 0% [0%, 0%] · B 0% [0%, 1%]
Format failures A 0% [0%, 1%] · B 0% [0%, 1%] (the coach answered badly; separate from the score)
Transport errors A 0 of 280 · B 0 of 280 calls (no answer at all; separate from both)
Median latency per answer 7.0 s → 6.8 s

## Flips beyond noise: better (0)

## Flips beyond noise: worse (0)

_A flip is flagged only when every valid answer of one run scores above every valid answer of the other, with 2+ answers in each._

## Unstable cases (agreement below 0.67) (2)
- block-comfort13-trade-fliers (block): A 50%, B 60%
- block-trample7-first-strike (block): B 50%

## Per-case difference (B − A), cases that differ

| case | type | A mean | B mean | diff |
|---|---|---:|---:|---:|
| block-comfort13-trade-fliers | block | +0.50 | +0.40 | −0.10 |
| target-ability42-seismic-takedown | target | +1.00 | +0.90 | −0.10 |
| attack-ability42-flier-and-quake | attack | +0.10 | +0.00 | −0.10 |
| spell-auto2026-turn2 | spell | +1.00 | +0.80 | −0.20 |

