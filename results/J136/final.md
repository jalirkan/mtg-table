# Cube populations compared

4 populations, the same 400 draft seeds each (836100001..836100400). 95% intervals: percentile, 1000 draft-clustered bootstrap replicates (seed 1), the seeds resampled jointly across populations, so a difference is paired; the replicates of flatness, pair_spread and first_pick_top10 are recentred on their estimate, because a resample biases those three upward (D441). Colour pairs count with 30+ decisive games; card flatness is ForgeCoach's (flatness.ts) over cards with 10+ decisive games.

| # | population | cube | sha | ratings | weights | drafts | games | decisive | engine errors | run folder |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | omega | var/lab-j136/evolve/omega/omega-cube-180.md | 9754939770cc | Forge's ranks | defaults | 400 | 1005 | 1005 | 0 | var/lab-j136/final/runs/omega |
| 2 | hits | var/lab-j136/evolve/hits/hits-180.md | a624a49b401e | Forge's ranks | defaults | 400 | 992 | 992 | 0 | var/lab-j136/final/runs/hits |
| 3 | random | var/lab-j136/evolve/random/random-180.md | b17daff7fae4 | Forge's ranks | defaults | 400 | 990 | 990 | 0 | var/lab-j136/final/runs/random |
| 4 | synergy | var/lab-j136/evolve/synergy/synergy-v2-cube-180.md | ac26eb760734 | Forge's ranks | defaults | 400 | 967 | 965 | 3 | var/lab-j136/final/runs/synergy |

No `--rule` was given: the tables rank and give intervals; they deliver no verdict.

## Card-rate flatness: true SD of the cards' win rates (`flatness`, pts)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 0.00 | [0.00, 3.29] | 1000 |
| 2 | hits | 0.00 | [0.00, 3.51] | 1000 |
| 3 | random | 2.17 | [0.00, 4.70] | 1000 |
| 4 | synergy | 7.84 | [5.95, 9.69] | 1000 |

ForgeCoach's own reading of each (its chi-square interval on the observed variance, not the bootstrap): omega 0.00 [0.00, 3.39], unclear, 165 cards; hits 0.00 [0.00, 3.24], unclear, 155 cards; random 2.17 [0.00, 4.53], unclear, 151 cards; synergy 7.84 [6.73, 9.59], uneven, 156 cards.

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | 0.00 | [-3.34, +3.14] | no |
| omega - random | -2.17 | [-4.40, +2.58] | no |
| omega - synergy | -7.84 | [-9.49, -4.28] | yes |
| hits - random | -2.17 | [-4.54, +2.55] | no |
| hits - synergy | -7.84 | [-9.57, -4.28] | yes |
| random - synergy | -5.68 | [-9.12, -2.45] | yes |

Differences whose interval excludes 0: omega - synergy -7.84; hits - synergy -7.84; random - synergy -5.68.

## Colour-pair spread: max - min pair win rate (`pair_spread`, pts)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | hits | 23.7 | [11.2, 41.5] | 1000 |
| 2 | omega | 23.7 | [13.4, 34.3] | 1000 |
| 3 | random | 23.9 | [10.6, 39.5] | 1000 |
| 4 | synergy | 44.9 | [34.9, 57.7] | 1000 |

Pairs with 30+ decisive games: omega 10, hits 9, random 8, synergy 10.

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | +0.1 | [-19.8, +17.1] | no |
| omega - random | -0.1 | [-18.9, +17.1] | no |
| omega - synergy | -21.2 | [-36.5, -6.9] | yes |
| hits - random | -0.2 | [-21.5, +23.3] | no |
| hits - synergy | -21.3 | [-38.7, -0.7] | yes |
| random - synergy | -21.1 | [-37.7, -3.0] | yes |

Differences whose interval excludes 0: omega - synergy -21.2; hits - synergy -21.3; random - synergy -21.1.

## Colour pairs within 5 points of 50% (`pair_within5`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy | 20.0 | [0.0, 50.0] | 1000 |
| 2 | random | 37.5 | [25.0, 75.0] | 1000 |
| 3 | omega | 50.0 | [30.0, 70.0] | 1000 |
| 4 | hits | 66.7 | [30.0, 87.5] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | -16.7 | [-47.5, +32.5] | no |
| omega - random | +12.5 | [-37.1, +37.1] | no |
| omega - synergy | +30.0 | [-10.0, +60.0] | no |
| hits - random | +29.2 | [-30.6, +50.0] | no |
| hits - synergy | +46.7 | [-5.0, +67.8] | no |
| random - synergy | +17.5 | [-11.4, +61.4] | no |

No difference's interval excludes 0.

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
| 1 | hits | 16.23 | [15.96, 16.50] | 1000 |
| 2 | omega | 18.73 | [18.35, 19.12] | 1000 |
| 3 | random | 19.42 | [19.08, 19.76] | 1000 |
| 4 | synergy | 19.58 | [19.25, 19.95] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | +2.50 | [+2.05, +2.97] | yes |
| omega - random | -0.69 | [-1.21, -0.20] | yes |
| omega - synergy | -0.85 | [-1.35, -0.35] | yes |
| hits - random | -3.19 | [-3.64, -2.75] | yes |
| hits - synergy | -3.35 | [-3.80, -2.92] | yes |
| random - synergy | -0.16 | [-0.67, +0.37] | no |

Differences whose interval excludes 0: omega - hits +2.50; omega - random -0.69; omega - synergy -0.85; hits - random -3.19; hits - synergy -3.35.

## Mean lands in a played deck (`lands`, lands)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy | 16.391 | [16.361, 16.424] | 1000 |
| 2 | omega | 16.991 | [16.984, 16.997] | 1000 |
| 3 | hits | 16.994 | [16.989, 16.999] | 1000 |
| 4 | random | 16.997 | [16.994, 17.000] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | -0.002 | [-0.009, +0.005] | no |
| omega - random | -0.006 | [-0.014, +0.001] | no |
| omega - synergy | +0.600 | [+0.567, +0.631] | yes |
| hits - random | -0.004 | [-0.010, +0.002] | no |
| hits - synergy | +0.602 | [+0.569, +0.633] | yes |
| random - synergy | +0.606 | [+0.575, +0.636] | yes |

Differences whose interval excludes 0: omega - synergy +0.600; hits - synergy +0.602; random - synergy +0.606.

## Mean colours in a played deck (main + splash) (`colours`, colours)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 2.109 | [2.087, 2.129] | 1000 |
| 2 | synergy | 2.179 | [2.152, 2.205] | 1000 |
| 3 | hits | 2.426 | [2.390, 2.460] | 1000 |
| 4 | random | 2.755 | [2.726, 2.784] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | -0.317 | [-0.360, -0.279] | yes |
| omega - random | -0.646 | [-0.684, -0.610] | yes |
| omega - synergy | -0.070 | [-0.105, -0.038] | yes |
| hits - random | -0.329 | [-0.374, -0.284] | yes |
| hits - synergy | +0.248 | [+0.207, +0.290] | yes |
| random - synergy | +0.576 | [+0.534, +0.615] | yes |

Differences whose interval excludes 0: omega - hits -0.317; omega - random -0.646; omega - synergy -0.070; hits - random -0.329; hits - synergy +0.248; random - synergy +0.576.

## Played decks with exactly two main colours (`two_colour`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | random | 99.9 | [99.6, 100.0] | 1000 |
| 2 | synergy | 99.9 | [99.6, 100.0] | 1000 |
| 3 | omega | 100.0 | [100.0, 100.0] | 1000 |
| 4 | hits | 100.0 | [100.0, 100.0] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | 0.0 | [0.0, 0.0] | no |
| omega - random | +0.1 | [0.0, +0.4] | no |
| omega - synergy | +0.1 | [0.0, +0.4] | no |
| hits - random | +0.1 | [0.0, +0.4] | no |
| hits - synergy | +0.1 | [0.0, +0.4] | no |
| random - synergy | 0.0 | [-0.4, +0.4] | no |

No difference's interval excludes 0.

## Played decks with a splash (`splash`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 10.9 | [8.7, 12.9] | 1000 |
| 2 | synergy | 17.8 | [15.3, 20.4] | 1000 |
| 3 | hits | 42.6 | [39.0, 46.0] | 1000 |
| 4 | random | 75.4 | [72.5, 78.3] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | -31.8 | [-36.0, -27.9] | yes |
| omega - random | -64.5 | [-68.3, -60.9] | yes |
| omega - synergy | -6.9 | [-10.3, -3.5] | yes |
| hits - random | -32.8 | [-37.3, -28.3] | yes |
| hits - synergy | +24.9 | [+20.9, +29.1] | yes |
| random - synergy | +57.6 | [+53.3, +61.5] | yes |

Differences whose interval excludes 0: omega - hits -31.8; omega - random -64.5; omega - synergy -6.9; hits - random -32.8; hits - synergy +24.9; random - synergy +57.6.

## First-pick concentration: share of first-line cards that are the top 10 (`first_pick_top10`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | omega | 11.7 | [11.5, 11.9] | 1000 |
| 2 | synergy | 12.7 | [12.4, 12.9] | 1000 |
| 3 | hits | 13.2 | [13.0, 13.4] | 1000 |
| 4 | random | 13.5 | [13.3, 13.7] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| omega - hits | -1.5 | [-1.8, -1.2] | yes |
| omega - random | -1.9 | [-2.2, -1.6] | yes |
| omega - synergy | -1.0 | [-1.3, -0.7] | yes |
| hits - random | -0.3 | [-0.6, -0.1] | yes |
| hits - synergy | +0.5 | [+0.2, +0.9] | yes |
| random - synergy | +0.9 | [+0.6, +1.2] | yes |

Differences whose interval excludes 0: omega - hits -1.5; omega - random -1.9; omega - synergy -1.0; hits - random -0.3; hits - synergy +0.5; random - synergy +0.9.

