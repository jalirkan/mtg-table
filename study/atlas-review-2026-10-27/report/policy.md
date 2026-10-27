# (5) Designs re-scored on the as-run branches

All 29 spines (old 13, D486 13, D488 3), every branched decision. Base: 65 confident (this bootstrap's flags) on 110.6 branch wh = 0.588 / wh = **32.8 a 7-worker night** (J171's conversion, 55.8 branch wh a night). Gain = (confident / wh) over the base's, with a 95% spine-cluster bootstrap (2,000 draws, a spine id drawn for old and D486 together, the D488 spines on their own). A filter keeps only the decisions in its cell: the night is assumed to find enough such decisions (see the availability column), which for the narrow filters means more spines, each a baseline game of seconds.

| decisions | design | complete | confident | wh | conf / wh | per night | gain | 95% (spines) | listed k>=3 a spine | the confident labels: share attack/block, k5+, turn 15+ |
|---|---|---|---|---|---|---|---|---|---|---|
| all (as run) | as run (200, screen, stops) | 222 | 65 | 110.61 | 0.59 | 32.79 | +0% | +0% to +0% | 14.1 | att/blk 29%, k5+ 45%, turn 15+ 29% |
| all (as run) | cap 150 | 222 | 64 | 89.51 | 0.72 | 39.90 | +22% | +11% to +34% | 14.1 | att/blk 27%, k5+ 41%, turn 15+ 25% |
| all (as run) | futility at 50 (o0 leads) | 222 | 62 | 90.08 | 0.69 | 38.40 | +17% | +10% to +24% | 14.1 | att/blk 29%, k5+ 47%, turn 15+ 29% |
| all (as run) | futility at 100 (o0 leads) | 222 | 65 | 97.21 | 0.67 | 37.31 | +14% | +10% to +19% | 14.1 | att/blk 29%, k5+ 45%, turn 15+ 29% |
| all (as run) | no Forge map | 222 | 65 | 108.59 | 0.60 | 33.40 | +2% | +0% to +4% | 14.1 | att/blk 29%, k5+ 45%, turn 15+ 29% |
| all (as run) | futility 50 + cap 150 | 222 | 61 | 74.67 | 0.82 | 45.58 | +39% | +25% to +55% | 14.1 | att/blk 28%, k5+ 43%, turn 15+ 26% |
| all (as run) | futility 50 + cap 150 + no Forge map | 222 | 61 | 73.13 | 0.83 | 46.54 | +42% | +26% to +60% | 14.1 | att/blk 28%, k5+ 43%, turn 15+ 26% |
| k >= 4 | as run (200, screen, stops) | 130 | 48 | 70.87 | 0.68 | 37.79 | +15% | -3% to +41% | 6.6 | att/blk 29%, k5+ 60%, turn 15+ 33% |
| k >= 4 | futility 50 + cap 150 | 130 | 44 | 50.56 | 0.87 | 48.56 | +48% | +25% to +88% | 6.6 | att/blk 27%, k5+ 59%, turn 15+ 30% |
| k >= 5 | as run (200, screen, stops) | 74 | 29 | 46.24 | 0.63 | 34.99 | +7% | -28% to +60% | 4.3 | att/blk 24%, k5+ 100%, turn 15+ 38% |
| k >= 5 | futility 50 + cap 150 | 74 | 26 | 33.65 | 0.77 | 43.11 | +31% | -12% to +95% | 4.3 | att/blk 19%, k5+ 100%, turn 15+ 35% |
| skip turns 1-4 | as run (200, screen, stops) | 212 | 63 | 106.40 | 0.59 | 33.04 | +1% | -5% to +7% | 13.6 | att/blk 30%, k5+ 46%, turn 15+ 30% |
| skip turns 1-4 | futility 50 + cap 150 | 212 | 59 | 72.50 | 0.81 | 45.41 | +38% | +24% to +57% | 13.6 | att/blk 29%, k5+ 44%, turn 15+ 27% |
| skip turns 1-8 | as run (200, screen, stops) | 145 | 48 | 70.79 | 0.68 | 37.83 | +15% | -2% to +40% | 10.8 | att/blk 33%, k5+ 50%, turn 15+ 40% |
| skip turns 1-8 | futility 50 + cap 150 | 145 | 45 | 50.38 | 0.89 | 49.84 | +52% | +19% to +101% | 10.8 | att/blk 31%, k5+ 44%, turn 15+ 36% |
| skip turns 15+ | as run (200, screen, stops) | 159 | 46 | 82.96 | 0.55 | 30.94 | -6% | -22% to +9% | 9.1 | att/blk 30%, k5+ 39%, turn 15+ 0% |
| skip turns 15+ | futility 50 + cap 150 | 159 | 45 | 55.73 | 0.81 | 45.06 | +37% | +10% to +64% | 9.1 | att/blk 31%, k5+ 38%, turn 15+ 0% |
| priority only | as run (200, screen, stops) | 156 | 46 | 82.88 | 0.56 | 30.97 | -6% | -19% to +5% | 9.4 | att/blk 0%, k5+ 48%, turn 15+ 30% |
| priority only | futility 50 + cap 150 | 156 | 44 | 55.25 | 0.80 | 44.43 | +36% | +13% to +57% | 9.4 | att/blk 0%, k5+ 48%, turn 15+ 30% |
| attack + block only | as run (200, screen, stops) | 66 | 19 | 27.73 | 0.69 | 38.23 | +17% | -16% to +59% | 4.7 | att/blk 100%, k5+ 37%, turn 15+ 26% |
| attack + block only | futility 50 + cap 150 | 66 | 17 | 19.42 | 0.88 | 48.85 | +49% | +7% to +103% | 4.7 | att/blk 100%, k5+ 29%, turn 15+ 18% |
| no priority k3-4 | as run (200, screen, stops) | 131 | 45 | 67.83 | 0.66 | 37.02 | +13% | -5% to +40% | 10.2 | att/blk 42%, k5+ 64%, turn 15+ 29% |
| no priority k3-4 | futility 50 + cap 150 | 131 | 42 | 47.48 | 0.88 | 49.35 | +51% | +28% to +83% | 10.2 | att/blk 40%, k5+ 62%, turn 15+ 24% |
| peasant only | as run (200, screen, stops) | 51 | 20 | 27.56 | 0.73 | 40.50 | +24% | -16% to +435% | 4.1 | att/blk 30%, k5+ 50%, turn 15+ 35% |
| peasant only | futility 50 + cap 150 | 51 | 18 | 19.53 | 0.92 | 51.43 | +57% | +29% to +243% | 4.1 | att/blk 22%, k5+ 44%, turn 15+ 22% |
| no pauper/legacy | as run (200, screen, stops) | 94 | 34 | 53.73 | 0.63 | 35.31 | +8% | -16% to +36% | 7.0 | att/blk 29%, k5+ 44%, turn 15+ 21% |
| no pauper/legacy | futility 50 + cap 150 | 94 | 33 | 37.56 | 0.88 | 49.02 | +50% | +21% to +92% | 7.0 | att/blk 24%, k5+ 42%, turn 15+ 12% |


## The same rules, seat by seat

| seat | design | confident | lost / gained vs 200 | wh | conf / wh | gain |
|---|---|---|---|---|---|---|
| old | as run (200, screen, stops) | 28 | -0 +0 | 50.86 | 0.55 | +0% |
| old | cap 150 | 28 | -2 +2 | 41.32 | 0.68 | +23% |
| old | futility at 50 (o0 leads) | 27 | -1 +0 | 39.91 | 0.68 | +23% |
| old | futility at 100 (o0 leads) | 28 | -0 +0 | 44.16 | 0.63 | +15% |
| old | no Forge map | 28 | -0 +0 | 49.96 | 0.56 | +2% |
| old | futility 50 + cap 150 | 27 | -3 +2 | 33.44 | 0.81 | +47% |
| old | futility 50 + cap 150 + no Forge map | 27 | -3 +2 | 32.73 | 0.82 | +50% |
| D486 | as run (200, screen, stops) | 28 | -0 +0 | 54.06 | 0.52 | +0% |
| D486 | cap 150 | 28 | -5 +5 | 43.60 | 0.64 | +24% |
| D486 | futility at 50 (o0 leads) | 27 | -1 +0 | 45.14 | 0.60 | +15% |
| D486 | futility at 100 (o0 leads) | 28 | -0 +0 | 47.78 | 0.59 | +13% |
| D486 | no Forge map | 28 | -0 +0 | 53.18 | 0.53 | +2% |
| D486 | futility 50 + cap 150 | 26 | -6 +4 | 37.11 | 0.70 | +35% |
| D486 | futility 50 + cap 150 + no Forge map | 26 | -6 +4 | 36.53 | 0.71 | +37% |
| D488 | as run (200, screen, stops) | 9 | -0 +0 | 5.69 | 1.58 | +0% |
| D488 | cap 150 | 8 | -1 +0 | 4.58 | 1.75 | +10% |
| D488 | futility at 50 (o0 leads) | 8 | -1 +0 | 5.02 | 1.59 | +1% |
| D488 | futility at 100 (o0 leads) | 9 | -0 +0 | 5.27 | 1.71 | +8% |
| D488 | no Forge map | 9 | -0 +0 | 5.45 | 1.65 | +5% |
| D488 | futility 50 + cap 150 | 8 | -1 +0 | 4.11 | 1.94 | +23% |
| D488 | futility 50 + cap 150 + no Forge map | 8 | -1 +0 | 3.88 | 2.06 | +30% |
