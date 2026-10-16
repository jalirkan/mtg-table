# Cube populations compared

5 populations, the same 600 draft seeds each (833000001..833000600). 95% intervals: percentile, 1000 draft-clustered bootstrap replicates (seed 1), the seeds resampled jointly across populations, so a difference is paired; the replicates of flatness, pair_spread and first_pick_top10 are recentred on their estimate, because a resample biases those three upward (D441). Colour pairs count with 30+ decisive games; card flatness is ForgeCoach's (flatness.ts) over cards with 10+ decisive games.

| # | population | cube | sha | ratings | weights | drafts | games | decisive | engine errors | run folder |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | omega | cubes/omega-cube-180.md | f6432a75975e | Forge's ranks | defaults | 600 | 1491 | 1491 | 0 | var/lab-j133/compare/runs/omega |
| 2 | fair_fight | cubes/fair-fight-cube-180.md | 7db6ad35f7ef | cubes/fair-fight-cube-180.ratings.tsv | defaults | 600 | 1499 | 1499 | 0 | var/lab-j133/compare/runs/fair_fight |
| 3 | synergy | var/lab-j133/cubes/synergy-cube-180.md | 8cb5e5f0827a | Forge's ranks | defaults | 600 | 1440 | 1436 | 2 | var/lab-j133/compare/runs/synergy |
| 4 | synergy_v1 | cubes/synergy-cube-180.md | 7e4f1e95fe38 | cubes/synergy-cube-180.ratings.tsv | defaults | 600 | 1445 | 1444 | 0 | var/lab-j133/compare/runs/synergy_v1 |
| 5 | synergy_17 | var/lab-j133/cubes/synergy-cube-180.md | 8cb5e5f0827a | Forge's ranks | sixteenLandsAt=0 | 600 | 1424 | 1422 | 1 | var/lab-j133/compare/runs/synergy_17 |

No `--rule` was given: the tables rank and give intervals; they deliver no verdict.

## Card-rate flatness: true SD of the cards' win rates (`flatness`, pts)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 0.00 | [0.00, 3.01] | 1000 |
| 2 | fair_fight | 3.59 | [1.51, 5.03] | 1000 |
| 3 | synergy_v1 | 7.50 | [5.99, 8.87] | 1000 |
| 4 | synergy | 7.83 | [6.37, 9.35] | 1000 |
| 5 | synergy_17 | 8.39 | [6.86, 9.95] | 1000 |

ForgeCoach's own reading of each (its chi-square interval on the observed variance, not the bootstrap): omega 0.00 [0.00, 3.22], unclear, 165 cards; fair_fight 3.59 [2.59, 5.33], unclear, 160 cards; synergy 7.83 [6.80, 9.40], uneven, 157 cards; synergy_v1 7.50 [6.47, 9.11], uneven, 158 cards; synergy_17 8.39 [7.30, 10.02], uneven, 155 cards.

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | -3.59 | [-4.83, +0.23] | no |
| omega - synergy | -7.83 | [-9.08, -4.27] | yes |
| omega - synergy_v1 | -7.50 | [-8.71, -4.08] | yes |
| omega - synergy_17 | -8.39 | [-9.78, -4.85] | yes |
| fair_fight - synergy | -4.24 | [-6.77, -2.12] | yes |
| fair_fight - synergy_v1 | -3.91 | [-6.47, -1.65] | yes |
| fair_fight - synergy_17 | -4.80 | [-7.54, -2.58] | yes |
| synergy - synergy_v1 | +0.33 | [-1.60, +2.40] | no |
| synergy - synergy_17 | -0.56 | [-2.30, +1.26] | no |
| synergy_v1 - synergy_17 | -0.89 | [-2.91, +1.41] | no |

Differences whose interval excludes 0: omega - synergy -7.83; omega - synergy_v1 -7.50; omega - synergy_17 -8.39; fair_fight - synergy -4.24; fair_fight - synergy_v1 -3.91; fair_fight - synergy_17 -4.80.

## Colour-pair spread: max - min pair win rate (`pair_spread`, pts)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 13.7 | [6.3, 22.2] | 1000 |
| 2 | fair_fight | 24.0 | [17.2, 31.9] | 1000 |
| 3 | synergy | 41.6 | [32.9, 51.9] | 1000 |
| 4 | synergy_17 | 42.3 | [32.9, 53.3] | 1000 |
| 5 | synergy_v1 | 43.4 | [34.6, 52.7] | 1000 |

Pairs with 30+ decisive games: omega 10, fair_fight 10, synergy 10, synergy_v1 10, synergy_17 10.

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | -10.2 | [-21.2, +0.7] | no |
| omega - synergy | -27.9 | [-41.8, -14.8] | yes |
| omega - synergy_v1 | -29.7 | [-41.8, -17.7] | yes |
| omega - synergy_17 | -28.6 | [-42.8, -16.0] | yes |
| fair_fight - synergy | -17.6 | [-30.0, -6.2] | yes |
| fair_fight - synergy_v1 | -19.5 | [-30.0, -7.8] | yes |
| fair_fight - synergy_17 | -18.3 | [-32.1, -6.9] | yes |
| synergy - synergy_v1 | -1.8 | [-15.7, +11.8] | no |
| synergy - synergy_17 | -0.7 | [-12.3, +10.2] | no |
| synergy_v1 - synergy_17 | +1.1 | [-12.6, +14.1] | no |

Differences whose interval excludes 0: omega - synergy -27.9; omega - synergy_v1 -29.7; omega - synergy_17 -28.6; fair_fight - synergy -17.6; fair_fight - synergy_v1 -19.5; fair_fight - synergy_17 -18.3.

## Colour pairs within 5 points of 50% (`pair_within5`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v1 | 0.0 | [0.0, 30.0] | 1000 |
| 2 | synergy | 10.0 | [0.0, 30.0] | 1000 |
| 3 | synergy_17 | 20.0 | [0.0, 30.0] | 1000 |
| 4 | fair_fight | 40.0 | [20.0, 60.0] | 1000 |
| 5 | omega | 80.0 | [50.0, 90.0] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | +40.0 | [0.0, +60.0] | no |
| omega - synergy | +70.0 | [+30.0, +80.0] | yes |
| omega - synergy_v1 | +80.0 | [+30.0, +90.0] | yes |
| omega - synergy_17 | +60.0 | [+29.8, +80.0] | yes |
| fair_fight - synergy | +30.0 | [0.0, +50.2] | no |
| fair_fight - synergy_v1 | +40.0 | [0.0, +60.0] | no |
| fair_fight - synergy_17 | +20.0 | [0.0, +50.0] | no |
| synergy - synergy_v1 | +10.0 | [-20.0, +20.0] | no |
| synergy - synergy_17 | -10.0 | [-20.0, +20.0] | no |
| synergy_v1 - synergy_17 | -20.0 | [-30.0, +20.0] | no |

Differences whose interval excludes 0: omega - synergy +70.0; omega - synergy_v1 +80.0; omega - synergy_17 +60.0.

## Draws (timeouts included) per game (`draw_rate`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 0.00 | [0.00, 0.00] | 1000 |
| 2 | fair_fight | 0.00 | [0.00, 0.00] | 1000 |
| 3 | synergy_v1 | 0.07 | [0.00, 0.21] | 1000 |
| 4 | synergy_17 | 0.14 | [0.00, 0.35] | 1000 |
| 5 | synergy | 0.28 | [0.07, 0.56] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | 0.00 | [0.00, 0.00] | no |
| omega - synergy | -0.28 | [-0.56, -0.07] | yes |
| omega - synergy_v1 | -0.07 | [-0.21, 0.00] | no |
| omega - synergy_17 | -0.14 | [-0.35, 0.00] | no |
| fair_fight - synergy | -0.28 | [-0.56, -0.07] | yes |
| fair_fight - synergy_v1 | -0.07 | [-0.21, 0.00] | no |
| fair_fight - synergy_17 | -0.14 | [-0.35, 0.00] | no |
| synergy - synergy_v1 | +0.21 | [-0.07, +0.49] | no |
| synergy - synergy_17 | +0.14 | [-0.21, +0.49] | no |
| synergy_v1 - synergy_17 | -0.07 | [-0.29, +0.14] | no |

Differences whose interval excludes 0: omega - synergy -0.28; fair_fight - synergy -0.28.

## Timeouts per game (`timeout_rate`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 0.00 | [0.00, 0.00] | 1000 |
| 2 | fair_fight | 0.00 | [0.00, 0.00] | 1000 |
| 3 | synergy_v1 | 0.00 | [0.00, 0.00] | 1000 |
| 4 | synergy_17 | 0.14 | [0.00, 0.35] | 1000 |
| 5 | synergy | 0.28 | [0.07, 0.56] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | 0.00 | [0.00, 0.00] | no |
| omega - synergy | -0.28 | [-0.56, -0.07] | yes |
| omega - synergy_v1 | 0.00 | [0.00, 0.00] | no |
| omega - synergy_17 | -0.14 | [-0.35, 0.00] | no |
| fair_fight - synergy | -0.28 | [-0.56, -0.07] | yes |
| fair_fight - synergy_v1 | 0.00 | [0.00, 0.00] | no |
| fair_fight - synergy_17 | -0.14 | [-0.35, 0.00] | no |
| synergy - synergy_v1 | +0.28 | [+0.07, +0.56] | yes |
| synergy - synergy_17 | +0.14 | [-0.21, +0.49] | no |
| synergy_v1 - synergy_17 | -0.14 | [-0.35, 0.00] | no |

Differences whose interval excludes 0: omega - synergy -0.28; fair_fight - synergy -0.28; synergy - synergy_v1 +0.28.

## Mean game length, turns (`game_turns`, turns)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 18.39 | [18.11, 18.67] | 1000 |
| 2 | synergy_v1 | 19.29 | [19.01, 19.58] | 1000 |
| 3 | synergy | 19.30 | [18.99, 19.59] | 1000 |
| 4 | synergy_17 | 19.36 | [19.06, 19.64] | 1000 |
| 5 | fair_fight | 21.74 | [21.40, 22.10] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | -3.35 | [-3.80, -2.89] | yes |
| omega - synergy | -0.91 | [-1.30, -0.53] | yes |
| omega - synergy_v1 | -0.90 | [-1.29, -0.52] | yes |
| omega - synergy_17 | -0.97 | [-1.36, -0.59] | yes |
| fair_fight - synergy | +2.43 | [+2.00, +2.87] | yes |
| fair_fight - synergy_v1 | +2.44 | [+1.99, +2.91] | yes |
| fair_fight - synergy_17 | +2.38 | [+1.93, +2.79] | yes |
| synergy - synergy_v1 | +0.01 | [-0.41, +0.44] | no |
| synergy - synergy_17 | -0.05 | [-0.39, +0.28] | no |
| synergy_v1 - synergy_17 | -0.06 | [-0.49, +0.34] | no |

Differences whose interval excludes 0: omega - fair_fight -3.35; omega - synergy -0.91; omega - synergy_v1 -0.90; omega - synergy_17 -0.97; fair_fight - synergy +2.43; fair_fight - synergy_v1 +2.44; fair_fight - synergy_17 +2.38.

## Mean lands in a played deck (`lands`, lands)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v1 | 16.352 | [16.327, 16.378] | 1000 |
| 2 | synergy | 16.391 | [16.364, 16.415] | 1000 |
| 3 | fair_fight | 16.867 | [16.848, 16.884] | 1000 |
| 4 | omega | 16.984 | [16.977, 16.991] | 1000 |
| 5 | synergy_17 | 17.000 | [17.000, 17.000] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | +0.117 | [+0.098, +0.136] | yes |
| omega - synergy | +0.593 | [+0.568, +0.622] | yes |
| omega - synergy_v1 | +0.633 | [+0.606, +0.658] | yes |
| omega - synergy_17 | -0.016 | [-0.023, -0.009] | yes |
| fair_fight - synergy | +0.477 | [+0.448, +0.508] | yes |
| fair_fight - synergy_v1 | +0.516 | [+0.486, +0.544] | yes |
| fair_fight - synergy_17 | -0.133 | [-0.152, -0.116] | yes |
| synergy - synergy_v1 | +0.039 | [+0.006, +0.071] | yes |
| synergy - synergy_17 | -0.609 | [-0.636, -0.585] | yes |
| synergy_v1 - synergy_17 | -0.648 | [-0.673, -0.622] | yes |

Differences whose interval excludes 0: omega - fair_fight +0.117; omega - synergy +0.593; omega - synergy_v1 +0.633; omega - synergy_17 -0.016; fair_fight - synergy +0.477; fair_fight - synergy_v1 +0.516; fair_fight - synergy_17 -0.133; synergy - synergy_v1 +0.039; synergy - synergy_17 -0.609; synergy_v1 - synergy_17 -0.648.

## Mean colours in a played deck (main + splash) (`colours`, colours)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_17 | 2.133 | [2.115, 2.153] | 1000 |
| 2 | omega | 2.136 | [2.116, 2.154] | 1000 |
| 3 | synergy_v1 | 2.142 | [2.124, 2.161] | 1000 |
| 4 | synergy | 2.162 | [2.143, 2.183] | 1000 |
| 5 | fair_fight | 2.696 | [2.670, 2.718] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | -0.560 | [-0.588, -0.530] | yes |
| omega - synergy | -0.026 | [-0.052, +0.001] | no |
| omega - synergy_v1 | -0.006 | [-0.033, +0.021] | no |
| omega - synergy_17 | +0.002 | [-0.022, +0.026] | no |
| fair_fight - synergy | +0.534 | [+0.501, +0.564] | yes |
| fair_fight - synergy_v1 | +0.554 | [+0.521, +0.584] | yes |
| fair_fight - synergy_17 | +0.563 | [+0.532, +0.592] | yes |
| synergy - synergy_v1 | +0.020 | [-0.004, +0.045] | no |
| synergy - synergy_17 | +0.028 | [+0.013, +0.045] | yes |
| synergy_v1 - synergy_17 | +0.008 | [-0.019, +0.035] | no |

Differences whose interval excludes 0: omega - fair_fight -0.560; fair_fight - synergy +0.534; fair_fight - synergy_v1 +0.554; fair_fight - synergy_17 +0.563; synergy - synergy_17 +0.028.

## Played decks with exactly two main colours (`two_colour`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 100.0 | [100.0, 100.0] | 1000 |
| 2 | fair_fight | 100.0 | [100.0, 100.0] | 1000 |
| 3 | synergy | 100.0 | [100.0, 100.0] | 1000 |
| 4 | synergy_v1 | 100.0 | [100.0, 100.0] | 1000 |
| 5 | synergy_17 | 100.0 | [100.0, 100.0] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | 0.0 | [0.0, 0.0] | no |
| omega - synergy | 0.0 | [0.0, 0.0] | no |
| omega - synergy_v1 | 0.0 | [0.0, 0.0] | no |
| omega - synergy_17 | 0.0 | [0.0, 0.0] | no |
| fair_fight - synergy | 0.0 | [0.0, 0.0] | no |
| fair_fight - synergy_v1 | 0.0 | [0.0, 0.0] | no |
| fair_fight - synergy_17 | 0.0 | [0.0, 0.0] | no |
| synergy - synergy_v1 | 0.0 | [0.0, 0.0] | no |
| synergy - synergy_17 | 0.0 | [0.0, 0.0] | no |
| synergy_v1 - synergy_17 | 0.0 | [0.0, 0.0] | no |

No difference's interval excludes 0.

## Played decks with a splash (`splash`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_17 | 13.3 | [11.5, 15.3] | 1000 |
| 2 | omega | 13.6 | [11.6, 15.4] | 1000 |
| 3 | synergy_v1 | 14.2 | [12.4, 16.1] | 1000 |
| 4 | synergy | 16.2 | [14.3, 18.3] | 1000 |
| 5 | fair_fight | 69.6 | [67.0, 71.8] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | -56.0 | [-58.8, -53.0] | yes |
| omega - synergy | -2.6 | [-5.2, +0.1] | no |
| omega - synergy_v1 | -0.6 | [-3.3, +2.1] | no |
| omega - synergy_17 | +0.3 | [-2.3, +2.6] | no |
| fair_fight - synergy | +53.4 | [+50.1, +56.4] | yes |
| fair_fight - synergy_v1 | +55.4 | [+52.1, +58.4] | yes |
| fair_fight - synergy_17 | +56.3 | [+53.3, +59.3] | yes |
| synergy - synergy_v1 | +2.0 | [-0.4, +4.5] | no |
| synergy - synergy_17 | +2.8 | [+1.3, +4.5] | yes |
| synergy_v1 - synergy_17 | +0.8 | [-1.9, +3.5] | no |

Differences whose interval excludes 0: omega - fair_fight -56.0; fair_fight - synergy +53.4; fair_fight - synergy_v1 +55.4; fair_fight - synergy_17 +56.3; synergy - synergy_17 +2.8.

## First-pick concentration: share of first-line cards that are the top 10 (`first_pick_top10`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 11.7 | [11.5, 11.9] | 1000 |
| 2 | fair_fight | 12.6 | [12.4, 12.8] | 1000 |
| 3 | synergy | 12.8 | [12.6, 13.0] | 1000 |
| 4 | synergy_v1 | 12.8 | [12.6, 13.0] | 1000 |
| 5 | synergy_17 | 12.8 | [12.6, 13.0] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - fair_fight | -0.9 | [-1.1, -0.6] | yes |
| omega - synergy | -1.1 | [-1.3, -0.8] | yes |
| omega - synergy_v1 | -1.1 | [-1.3, -0.8] | yes |
| omega - synergy_17 | -1.1 | [-1.3, -0.8] | yes |
| fair_fight - synergy | -0.2 | [-0.5, +0.0] | no |
| fair_fight - synergy_v1 | -0.2 | [-0.5, +0.1] | no |
| fair_fight - synergy_17 | -0.2 | [-0.5, +0.0] | no |
| synergy - synergy_v1 | 0.0 | [-0.2, +0.3] | no |
| synergy - synergy_17 | 0.0 | [0.0, 0.0] | no |
| synergy_v1 - synergy_17 | 0.0 | [-0.3, +0.2] | no |

Differences whose interval excludes 0: omega - fair_fight -0.9; omega - synergy -1.1; omega - synergy_v1 -1.1; omega - synergy_17 -1.1.

