# (2) The branch budget

## (2a) Where the branch time went

| seat | branch wh | on confident | share | complete, not confident | share | screened | share | Forge map | share |
|---|---|---|---|---|---|---|---|---|---|
| old | 50.86 | 16.10 | 0.32 | 33.01 | 0.65 | 1.76 | 0.03 | 0.90 | 0.02 |
| D486 | 54.06 | 15.89 | 0.29 | 36.49 | 0.68 | 1.67 | 0.03 | 0.87 | 0.02 |
| D488 | 5.69 | 2.08 | 0.37 | 3.45 | 0.61 | 0.16 | 0.03 | 0.25 | 0.04 |
| all | 110.61 | 34.07 | 0.31 | 72.95 | 0.66 | 3.59 | 0.03 | 2.02 | 0.02 |

## (2b) The n curve: the atlas's arithmetic re-run on branches i < N (the as-run stops kept)

Reference "at 200" is this bootstrap's own flag at 200 (it matches atlas.json on 215 of 222; the 7 others sit at a low end within 0.0075 of zero). Cost at N = random rows i < N plus the Forge map.

| seat | N | confident at N | of which confident at 200 | share of the 200 set | confident at N but not at 200 | wh (complete decisions) | confident / wh |
|---|---|---|---|---|---|---|---|
| old | 25 | 16 | 10 | 10/28 = 0.36 | 6 | 9.14 | 1.75 |
| old | 50 | 18 | 13 | 13/28 = 0.46 | 5 | 16.51 | 1.09 |
| old | 100 | 19 | 17 | 17/28 = 0.61 | 2 | 28.81 | 0.66 |
| old | 150 | 28 | 26 | 26/28 = 0.93 | 2 | 39.56 | 0.71 |
| old | 200 | 28 | 28 | 28/28 = 1.00 | 0 | 49.11 | 0.57 |
| D486 | 25 | 18 | 13 | 13/28 = 0.46 | 5 | 9.68 | 1.86 |
| D486 | 50 | 17 | 15 | 15/28 = 0.54 | 2 | 17.92 | 0.95 |
| D486 | 100 | 21 | 20 | 20/28 = 0.71 | 1 | 30.57 | 0.69 |
| D486 | 150 | 28 | 23 | 23/28 = 0.82 | 5 | 41.93 | 0.67 |
| D486 | 200 | 28 | 28 | 28/28 = 1.00 | 0 | 52.39 | 0.53 |
| D488 | 25 | 7 | 5 | 5/9 = 0.56 | 2 | 1.07 | 6.53 |
| D488 | 50 | 8 | 6 | 6/9 = 0.67 | 2 | 1.84 | 4.35 |
| D488 | 100 | 9 | 8 | 8/9 = 0.89 | 1 | 3.19 | 2.82 |
| D488 | 150 | 8 | 8 | 8/9 = 0.89 | 0 | 4.42 | 1.81 |
| D488 | 200 | 9 | 9 | 9/9 = 1.00 | 0 | 5.53 | 1.63 |
| all | 25 | 41 | 28 | 28/65 = 0.43 | 13 | 19.89 | 2.06 |
| all | 50 | 43 | 34 | 34/65 = 0.52 | 9 | 36.27 | 1.19 |
| all | 100 | 49 | 45 | 45/65 = 0.69 | 4 | 62.57 | 0.78 |
| all | 150 | 64 | 57 | 57/65 = 0.88 | 7 | 85.92 | 0.74 |
| all | 200 | 65 | 65 | 65/65 = 1.00 | 0 | 107.02 | 0.61 |

### The last 50 branches

- 150 -> 200: **8 gained, 7 lost** (net 1) for 21.1 wh: 0.05 net confident / wh, against 0.58 for the whole design (new decisions).
- 100 -> 150: 21 gained, 6 lost for 23.3 wh: 0.64 net / wh.

## (2c) Extending the close ones (low end in (-0.03, 0] at 200) to 300 or 400

A normal projection that takes the 200-branch regret as the truth's centre (optimistic: the max over options is biased upward, and the measured 150 -> 200 step above is the honest check).

| N | close decisions | expected new confident (upper bound) | extra wh | confident / wh |
|---|---|---|---|---|
| 300 | 157 | 57.20 | 28.42 | 2.01 |
| 400 | 157 | 61.74 | 56.83 | 1.09 |

## (2d) A futility stop: end a decision at a checkpoint when option 0 (Forge's) leads

Saved = that decision's random rows past the checkpoint and its Forge map. Lost = its confident label at 200 (atlas flag). The yield column spends the saving on new decisions at the design's own rate.

| rule | decisions stopped | confident lost | wh saved | share of branch wh | confident / wh after | gain | the lost |
|---|---|---|---|---|---|---|---|
| at 25, o0 leads (or ties) | 78 | 6 | 25.88 | 0.23 | 0.68 | 0.18 | old s06 d12, old s07 d7, old s09 d17, old s10 d2, D488 s01 d24, D488 s02 d24 |
| at 50, o0 leads (or ties) | 77 | 3 | 20.53 | 0.19 | 0.68 | 0.17 | old s03 d0, D486 s11 d3, D488 s02 d24 |
| at 50, o0 within 0.02 of the leader | 89 | 3 | 25.00 | 0.23 | 0.71 | 0.23 | old s03 d0, D486 s11 d3, D488 s02 d24 |
| at 50, o0 within 0.04 of the leader | 107 | 7 | 31.09 | 0.28 | 0.72 | 0.24 | old s03 d0, old s07 d7, old s10 d28, D486 s07 d11, D486 s11 d3, D486 s11 d13, D488 s02 d24 |
| at 100, o0 leads (or ties) | 82 | 0 | 13.40 | 0.12 | 0.66 | 0.14 |  |
| at 100, o0 within 0.02 of the leader | 94 | 2 | 15.74 | 0.14 | 0.65 | 0.13 | D486 s11 d13, D488 s02 d24 |

## (2e) The screen (25 branches, mean value <= .04 or >= .96)

- **Passed it (222 complete):** the 25-branch mean value against the final mean value: correlation 0.988, median |difference| 0.026, 90th percentile 0.068, max 0.152.
- Bounds 0.06/0.94 would also have screened **13** complete decisions, saving 4.2 wh (3.8%), losing **3** confident (old s06 d6 regret 0.035, D486 s08 d7 regret 0.135, D488 s03 d11 regret 0.043).
- Bounds 0.08/0.92 would also have screened **33** complete decisions, saving 11.0 wh (10.0%), losing **11** confident (old s06 d6 regret 0.035, old s07 d7 regret 0.040, old s09 d17 regret 0.050, D486 s03 d20 regret 0.062, D486 s05 d6 regret 0.062, D486 s06 d14 regret 0.120, D486 s08 d7 regret 0.135, D486 s08 d9 regret 0.060, D488 s02 d7 regret 0.100, D488 s02 d24 regret 0.010, D488 s03 d11 regret 0.043).
- Bounds 0.10/0.90 would also have screened **46** complete decisions, saving 15.4 wh (13.9%), losing **13** confident (old s06 d6 regret 0.035, old s07 d7 regret 0.040, old s09 d17 regret 0.050, D486 s03 d20 regret 0.062, D486 s04 d7 regret 0.045, D486 s05 d6 regret 0.062, D486 s06 d14 regret 0.120, D486 s08 d7 regret 0.135, D486 s08 d9 regret 0.060, D486 s11 d12 regret 0.105, D488 s02 d7 regret 0.100, D488 s02 d24 regret 0.010, D488 s03 d11 regret 0.043).
- Bounds 0.15/0.85 would also have screened **68** complete decisions, saving 23.9 wh (21.6%), losing **18** confident (old s06 d6 regret 0.035, old s07 d7 regret 0.040, old s08 d7 regret 0.045, old s08 d12 regret 0.100, old s09 d17 regret 0.050, D486 s03 d20 regret 0.062, D486 s04 d7 regret 0.045, D486 s05 d6 regret 0.062, D486 s06 d14 regret 0.120, D486 s08 d7 regret 0.135, D486 s08 d9 regret 0.060, D486 s10 d40 regret 0.062, D486 s11 d12 regret 0.105, D486 s11 d14 regret 0.040, D488 s01 d17 regret 0.205, D488 s02 d7 regret 0.100, D488 s02 d24 regret 0.010, D488 s03 d11 regret 0.043).
- **Screened (100):** at 25 branches, the observed regret of o0 (best mean − o0 mean): median 0.000, max 0.080; 20 of 100 above 0, 15 at 0.04 or more. The bound is k × .04 (D480 point 3).
- Screened by side: 54 lost (<= .04), 46 won (>= .96).

The screened decisions with the largest observed gap at 25:

| seat | spine | d | kind | k | turn | mean value at 25 | o0 regret at 25 | bound k×.04 | rows |
|---|---|---|---|---|---|---|---|---|---|
| old | s04 | 5 | p | 5 | 11 | 0.02 | 0.08 | 0.20 | 25 |
| old | s04 | 7 | p | 6 | 11 | 0.02 | 0.08 | 0.24 | 25 |
| D486 | s09 | 16 | b | 7 | 19 | 0.02 | 0.08 | 0.28 | 25 |
| D486 | s06 | 19 | p | 8 | 21 | 0.96 | 0.08 | 0.32 | 25 |
| D486 | s08 | 15 | p | 6 | 11 | 0.98 | 0.08 | 0.24 | 25 |
| old | s06 | 4 | p | 6 | 9 | 0.99 | 0.04 | 0.24 | 25 |
| old | s06 | 5 | p | 5 | 9 | 0.99 | 0.04 | 0.20 | 25 |
| old | s08 | 20 | p | 6 | 13 | 0.99 | 0.04 | 0.24 | 25 |

- Complete decisions whose final mean value is <= .06 or >= .94: 15, confident 5.

## (2f) Early stopping per option (50/100/150; o0 and the leader never stop)

- 294 options stopped on 142 complete decisions: at 50 173, at 100 68, at 150 53.
- A stopped option whose mean at its stop is at or above the final best's mean (a possible missed winner): **0**; within .02 of it: 1.
- Decisions where the leader at a stop was not the final best: 31.
- Stopped options whose stop-time mean was above o0's final mean (they matter to the regret only if they were the true best): 48.

## (2g) How firm the confident labels are

- Confident labels with a low end at or below 0.01: **13 of 64** (old 8, D486 3, D488 2). Scores are 0 / .5 / 1, so the low end moves in steps of .0025 and these flip with the bootstrap seed (7 flags differ between this bootstrap and the atlas's).
