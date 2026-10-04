
# Coach bench — A old-prompt → B new-prompt

**Verdict: No detectable difference between A (old-prompt) and B (new-prompt): the 95% interval of the mean score difference includes zero.**

Paired over 28 cases (3 vs 3 answers per case). Mean score difference (B − A) −0.02 [−0.08, +0.05]; total −0.67 [−2.33, +1.33]. Cases better 1, worse 4, unchanged 23; sign test p = 0.375.

Quality score A 0.94 [0.86, 1.00] · B 0.92 [0.81, 0.99]
Acceptable A 95% [88%, 100%] · B 92% [81%, 99%]
Blunder A 1% [0%, 4%] · B 0% [0%, 0%]
Format failures A 0% [0%, 4%] · B 0% [0%, 4%] (the coach answered badly; separate from the score)
Transport errors A 0 of 84 · B 0 of 84 calls (no answer at all; separate from both)
Median latency per answer 6.9 s → 6.7 s

## Flips beyond noise: better (0)

## Flips beyond noise: worse (0)

_A flip is flagged only when every valid answer of one run scores above every valid answer of the other, with 2+ answers in each._

## Unstable cases (agreement below 0.67) (6)
- attack-ability42-flier-and-quake (attack): A 67%
- attack-comfort13-hold-flier-home (attack): A 67%
- block-comfort13-must-block (block): A 67%, B 67%
- block-comfort13-trade-fliers (block): A 67%, B 67%
- block-number7-hellion (block): B 67%
- spell-comfort13-turn3-play (spell): B 67%

## Per-case difference (B − A), cases that differ

| case | type | A mean | B mean | diff |
|---|---|---:|---:|---:|
| attack-comfort13-hold-flier-home | attack | +0.33 | +1.00 | +0.67 |
| attack-ability42-flier-and-quake | attack | +0.33 | +0.00 | −0.33 |
| block-comfort13-trade-fliers | block | +0.67 | +0.33 | −0.33 |
| block-comfort13-must-block | block | +1.00 | +0.67 | −0.33 |
| spell-comfort13-turn3-play | spell | +1.00 | +0.67 | −0.33 |

