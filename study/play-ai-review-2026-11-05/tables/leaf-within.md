# Between-game and within-game signal of the two leaves (gate 1, J092: 27,628 turn-end positions, 1,500 held-out games)

positions 27628, games 1500; hand leaf read as leaf/351.6 (J092 clause B); both refitted a + b x on these rows for the log-loss column.

| measure | evaluator v2 | hand leaf |
|---|---|---|
| log-loss, all positions (refitted) | 0.5177 | 0.5998 |
| log-loss, turns 1-2 (3000 positions) | 0.6599 | 0.6864 |
| log-loss, turns 3-4 (3000 positions) | 0.6397 | 0.6753 |
| log-loss, turns 5-8 (5993 positions) | 0.5888 | 0.6432 |
| log-loss, turns 9-14 (8288 positions) | 0.4708 | 0.5617 |
| log-loss, turns 15-+ (7347 positions) | 0.4047 | 0.5413 |
| share of the score's variance that is between games (ICC) | 0.48 | 0.35 |
| turn-to-turn change points toward the eventual winner (share of non-zero moves) | 0.531 (n 26128) | 0.497 (n 26038) |
| corr(turn-to-turn change, eventual result), changes on the refitted logit scale | 0.159 | 0.107 |

Evaluator minus hand leaf, turn-to-turn agreement: +0.034 [+0.030, +0.038] (1,000 resamples of games).
