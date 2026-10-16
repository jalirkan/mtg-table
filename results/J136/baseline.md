# Cube populations compared

4 populations, the same 400 draft seeds each (836000001..836000400). 95% intervals: percentile, 1000 draft-clustered bootstrap replicates (seed 1), the seeds resampled jointly across populations, so a difference is paired; the replicates of flatness, pair_spread and first_pick_top10 are recentred on their estimate, because a resample biases those three upward (D441). Colour pairs count with 30+ decisive games; card flatness is ForgeCoach's (flatness.ts) over cards with 10+ decisive games.

| # | population | cube | sha | ratings | weights | drafts | games | decisive | engine errors | run folder |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | omega | cubes/omega-cube-180.md | f6432a75975e | Forge's ranks | defaults | 400 | 999 | 999 | 0 | var/lab-j136/baseline/runs/omega |
| 2 | hits | cubes/library/hits-180.md | 617f25e9f13d | Forge's ranks | defaults | 400 | 997 | 997 | 0 | var/lab-j136/baseline/runs/hits |
| 3 | random | cubes/library/random-180.md | e6c5a4f0bb00 | Forge's ranks | defaults | 400 | 972 | 972 | 0 | var/lab-j136/baseline/runs/random |
| 4 | synergy | var/lab-j136/cubes/synergy-v2-cube-180.md | 8cb5e5f0827a | Forge's ranks | defaults | 400 | 966 | 964 | 2 | var/lab-j136/baseline/runs/synergy |

No `--rule` was given: the tables rank and give intervals; they deliver no verdict.

## Card-rate flatness: true SD of the cards' win rates (`flatness`, pts)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 0.00 | [0.00, 0.00] | 1000 |
| 2 | hits | 0.00 | [0.00, 3.41] | 1000 |
| 3 | random | 0.00 | [0.00, 3.64] | 1000 |
| 4 | synergy | 8.06 | [6.27, 9.61] | 1000 |

ForgeCoach's own reading of each (its chi-square interval on the observed variance, not the bootstrap): omega 0.00 [0.00, 0.72], flat, 161 cards; hits 0.00 [0.00, 3.59], unclear, 154 cards; random 0.00 [0.00, 3.49], unclear, 151 cards; synergy 8.06 [6.94, 9.80], uneven, 154 cards.

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | 0.00 | [-3.40, 0.00] | no |
| omega - random | 0.00 | [-3.64, 0.00] | no |
| omega - synergy | -8.06 | [-9.61, -6.22] | yes |
| hits - random | 0.00 | [-3.36, +3.15] | no |
| hits - synergy | -8.06 | [-9.47, -4.27] | yes |
| random - synergy | -8.06 | [-9.51, -3.54] | yes |

Differences whose interval excludes 0: omega - synergy -8.06; hits - synergy -8.06; random - synergy -8.06.

## Colour-pair spread: max - min pair win rate (`pair_spread`, pts)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 8.2 | [0.0, 21.0] | 1000 |
| 2 | random | 11.0 | [0.0, 28.7] | 1000 |
| 3 | hits | 15.9 | [5.5, 29.7] | 1000 |
| 4 | synergy | 45.0 | [36.1, 54.7] | 1000 |

Pairs with 30+ decisive games: omega 10, hits 9, random 7, synergy 10.

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | -7.7 | [-24.1, +8.8] | no |
| omega - random | -2.8 | [-22.3, +13.4] | no |
| omega - synergy | -36.8 | [-49.4, -21.7] | yes |
| hits - random | +4.9 | [-17.3, +24.3] | no |
| hits - synergy | -29.1 | [-43.6, -12.5] | yes |
| random - synergy | -34.0 | [-49.0, -14.4] | yes |

Differences whose interval excludes 0: omega - synergy -36.8; hits - synergy -29.1; random - synergy -34.0.

## Colour pairs within 5 points of 50% (`pair_within5`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy | 20.0 | [0.0, 30.0] | 1000 |
| 2 | random | 71.4 | [28.6, 87.5] | 1000 |
| 3 | hits | 77.8 | [30.0, 88.9] | 1000 |
| 4 | omega | 80.0 | [40.0, 100.0] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | +2.2 | [-28.9, +55.6] | no |
| omega - random | +8.6 | [-31.4, +57.1] | no |
| omega - synergy | +60.0 | [+20.0, +88.9] | yes |
| hits - random | +6.3 | [-44.4, +42.9] | no |
| hits - synergy | +57.8 | [+10.0, +78.9] | yes |
| random - synergy | +51.4 | [+7.5, +80.0] | yes |

Differences whose interval excludes 0: omega - synergy +60.0; hits - synergy +57.8; random - synergy +51.4.

## Draws (timeouts included) per game (`draw_rate`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 0.00 | [0.00, 0.00] | 1000 |
| 2 | hits | 0.00 | [0.00, 0.00] | 1000 |
| 3 | random | 0.00 | [0.00, 0.00] | 1000 |
| 4 | synergy | 0.21 | [0.00, 0.52] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | 0.00 | [0.00, 0.00] | no |
| omega - random | 0.00 | [0.00, 0.00] | no |
| omega - synergy | -0.21 | [-0.52, 0.00] | no |
| hits - random | 0.00 | [0.00, 0.00] | no |
| hits - synergy | -0.21 | [-0.52, 0.00] | no |
| random - synergy | -0.21 | [-0.52, 0.00] | no |

No difference's interval excludes 0.

## Timeouts per game (`timeout_rate`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 0.00 | [0.00, 0.00] | 1000 |
| 2 | hits | 0.00 | [0.00, 0.00] | 1000 |
| 3 | random | 0.00 | [0.00, 0.00] | 1000 |
| 4 | synergy | 0.21 | [0.00, 0.52] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | 0.00 | [0.00, 0.00] | no |
| omega - random | 0.00 | [0.00, 0.00] | no |
| omega - synergy | -0.21 | [-0.52, 0.00] | no |
| hits - random | 0.00 | [0.00, 0.00] | no |
| hits - synergy | -0.21 | [-0.52, 0.00] | no |
| random - synergy | -0.21 | [-0.52, 0.00] | no |

No difference's interval excludes 0.

## Mean game length, turns (`game_turns`, turns)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | hits | 16.13 | [15.84, 16.41] | 1000 |
| 2 | omega | 18.94 | [18.63, 19.26] | 1000 |
| 3 | synergy | 19.42 | [19.07, 19.77] | 1000 |
| 4 | random | 19.75 | [19.40, 20.09] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | +2.81 | [+2.39, +3.23] | yes |
| omega - random | -0.81 | [-1.25, -0.35] | yes |
| omega - synergy | -0.48 | [-0.95, +0.02] | no |
| hits - random | -3.62 | [-4.08, -3.15] | yes |
| hits - synergy | -3.29 | [-3.77, -2.84] | yes |
| random - synergy | +0.33 | [-0.17, +0.81] | no |

Differences whose interval excludes 0: omega - hits +2.81; omega - random -0.81; hits - random -3.62; hits - synergy -3.29.

## Mean lands in a played deck (`lands`, lands)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy | 16.418 | [16.386, 16.448] | 1000 |
| 2 | omega | 16.994 | [16.988, 16.999] | 1000 |
| 3 | hits | 16.994 | [16.988, 16.999] | 1000 |
| 4 | random | 16.999 | [16.996, 17.000] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | 0.000 | [-0.009, +0.008] | no |
| omega - random | -0.005 | [-0.011, 0.000] | no |
| omega - synergy | +0.576 | [+0.546, +0.608] | yes |
| hits - random | -0.005 | [-0.011, 0.000] | no |
| hits - synergy | +0.576 | [+0.545, +0.609] | yes |
| random - synergy | +0.581 | [+0.551, +0.613] | yes |

Differences whose interval excludes 0: omega - synergy +0.576; hits - synergy +0.576; random - synergy +0.581.

## Mean colours in a played deck (main + splash) (`colours`, colours)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 2.134 | [2.109, 2.156] | 1000 |
| 2 | synergy | 2.191 | [2.165, 2.219] | 1000 |
| 3 | hits | 2.375 | [2.345, 2.403] | 1000 |
| 4 | random | 2.765 | [2.739, 2.792] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | -0.241 | [-0.279, -0.206] | yes |
| omega - random | -0.631 | [-0.666, -0.598] | yes |
| omega - synergy | -0.058 | [-0.092, -0.022] | yes |
| hits - random | -0.390 | [-0.431, -0.350] | yes |
| hits - synergy | +0.184 | [+0.144, +0.224] | yes |
| random - synergy | +0.574 | [+0.535, +0.611] | yes |

Differences whose interval excludes 0: omega - hits -0.241; omega - random -0.631; omega - synergy -0.058; hits - random -0.390; hits - synergy +0.184; random - synergy +0.574.

## Played decks with exactly two main colours (`two_colour`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 100.0 | [100.0, 100.0] | 1000 |
| 2 | hits | 100.0 | [100.0, 100.0] | 1000 |
| 3 | random | 100.0 | [100.0, 100.0] | 1000 |
| 4 | synergy | 100.0 | [100.0, 100.0] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | 0.0 | [0.0, 0.0] | no |
| omega - random | 0.0 | [0.0, 0.0] | no |
| omega - synergy | 0.0 | [0.0, 0.0] | no |
| hits - random | 0.0 | [0.0, 0.0] | no |
| hits - synergy | 0.0 | [0.0, 0.0] | no |
| random - synergy | 0.0 | [0.0, 0.0] | no |

No difference's interval excludes 0.

## Played decks with a splash (`splash`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 13.4 | [10.9, 15.6] | 1000 |
| 2 | synergy | 19.1 | [16.5, 21.9] | 1000 |
| 3 | hits | 37.5 | [34.5, 40.3] | 1000 |
| 4 | random | 76.5 | [73.9, 79.3] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | -24.1 | [-27.9, -20.6] | yes |
| omega - random | -63.1 | [-66.6, -59.8] | yes |
| omega - synergy | -5.8 | [-9.3, -2.2] | yes |
| hits - random | -39.0 | [-43.1, -35.0] | yes |
| hits - synergy | +18.4 | [+14.4, +22.4] | yes |
| random - synergy | +57.4 | [+53.5, +61.1] | yes |

Differences whose interval excludes 0: omega - hits -24.1; omega - random -63.1; omega - synergy -5.8; hits - random -39.0; hits - synergy +18.4; random - synergy +57.4.

## First-pick concentration: share of first-line cards that are the top 10 (`first_pick_top10`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 11.5 | [11.3, 11.7] | 1000 |
| 2 | synergy | 12.6 | [12.3, 12.8] | 1000 |
| 3 | hits | 12.9 | [12.7, 13.2] | 1000 |
| 4 | random | 13.3 | [13.1, 13.5] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | -1.5 | [-1.8, -1.2] | yes |
| omega - random | -1.8 | [-2.1, -1.6] | yes |
| omega - synergy | -1.1 | [-1.4, -0.8] | yes |
| hits - random | -0.4 | [-0.7, -0.1] | yes |
| hits - synergy | +0.4 | [+0.1, +0.7] | yes |
| random - synergy | +0.7 | [+0.4, +1.0] | yes |

Differences whose interval excludes 0: omega - hits -1.5; omega - random -1.8; omega - synergy -1.1; hits - random -0.4; hits - synergy +0.4; random - synergy +0.7.

