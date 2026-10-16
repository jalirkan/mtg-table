# Cube populations compared

2 populations, the same 1500 draft seeds each (837000001..837001500). 95% intervals: percentile, 1000 draft-clustered bootstrap replicates (seed 1), the seeds resampled jointly across populations, so a difference is paired; the replicates of flatness, pair_spread and first_pick_top10 are recentred on their estimate, because a resample biases those three upward (D441). Colour pairs count with 40+ decisive games; card flatness is ForgeCoach's (flatness.ts) over cards with 10+ decisive games.

| # | population | cube | sha | ratings | weights | drafts | games | decisive | engine errors | run folder |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | synergy_v2 | var/lab-j137/cubes/synergy-v2-cube-180.md | 8cb5e5f0827a | Forge's ranks | defaults | 1500 | 3606 | 3603 | 1 | var/lab-j137/compare/runs/synergy_v2 |
| 2 | synergy_v3 | var/lab-j137/cubes/synergy-v3-cube-180.md | 61989547fb03 | Forge's ranks | defaults | 1500 | 3604 | 3600 | 3 | var/lab-j137/compare/runs/synergy_v3 |

No `--rule` was given: the tables rank and give intervals; they deliver no verdict.

## Card-rate flatness: true SD of the cards' win rates (`flatness`, pts)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v3 | 5.89 | [4.81, 6.91] | 1000 |
| 2 | synergy_v2 | 7.95 | [6.99, 8.86] | 1000 |

ForgeCoach's own reading of each (its chi-square interval on the observed variance, not the bootstrap): synergy_v2 7.95 [7.03, 9.27], uneven, 164 cards; synergy_v3 5.89 [5.13, 7.07], uneven, 164 cards.

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | +2.05 | [+0.75, +3.33] | yes |

Differences whose interval excludes 0: synergy_v2 - synergy_v3 +2.05.

## Colour-pair spread: max - min pair win rate (`pair_spread`, pts)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v3 | 27.1 | [20.8, 35.1] | 1000 |
| 2 | synergy_v2 | 38.9 | [33.7, 44.3] | 1000 |

Pairs with 40+ decisive games: synergy_v2 10, synergy_v3 10.

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | +11.8 | [+3.2, +19.5] | yes |

Differences whose interval excludes 0: synergy_v2 - synergy_v3 +11.8.

## Colour pairs within 5 points of 50% (`pair_within5`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v2 | 20.0 | [0.0, 20.0] | 1000 |
| 2 | synergy_v3 | 20.0 | [10.0, 30.0] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | 0.0 | [-20.0, +10.0] | no |

No difference's interval excludes 0.

## Draws (timeouts included) per game (`draw_rate`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v2 | 0.08 | [0.00, 0.19] | 1000 |
| 2 | synergy_v3 | 0.11 | [0.03, 0.22] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | -0.03 | [-0.19, +0.11] | no |

No difference's interval excludes 0.

## Timeouts per game (`timeout_rate`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v2 | 0.08 | [0.00, 0.19] | 1000 |
| 2 | synergy_v3 | 0.08 | [0.00, 0.19] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | -0.00 | [-0.14, +0.14] | no |

No difference's interval excludes 0.

## Mean game length, turns (`game_turns`, turns)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v2 | 19.35 | [19.17, 19.52] | 1000 |
| 2 | synergy_v3 | 19.58 | [19.38, 19.77] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | -0.23 | [-0.49, +0.04] | no |

No difference's interval excludes 0.

## Mean lands in a played deck (`lands`, lands)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v2 | 16.377 | [16.362, 16.392] | 1000 |
| 2 | synergy_v3 | 16.483 | [16.467, 16.499] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | -0.106 | [-0.125, -0.088] | yes |

Differences whose interval excludes 0: synergy_v2 - synergy_v3 -0.106.

## Mean colours in a played deck (main + splash) (`colours`, colours)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v2 | 2.167 | [2.155, 2.180] | 1000 |
| 2 | synergy_v3 | 2.183 | [2.169, 2.196] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | -0.015 | [-0.031, +0.000] | no |

No difference's interval excludes 0.

## Played decks with exactly two main colours (`two_colour`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v2 | 100.0 | [100.0, 100.0] | 1000 |
| 2 | synergy_v3 | 100.0 | [100.0, 100.0] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | 0.0 | [0.0, 0.0] | no |

No difference's interval excludes 0.

## Played decks with a splash (`splash`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v2 | 16.7 | [15.5, 18.0] | 1000 |
| 2 | synergy_v3 | 18.3 | [16.9, 19.6] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | -1.5 | [-3.1, +0.0] | no |

No difference's interval excludes 0.

## First-pick concentration: share of first-line cards that are the top 10 (`first_pick_top10`, %)

| rank (1 = lowest) | population | estimate | 95% interval | replicates |
|---|---|---|---|---|
| 1 | synergy_v2 | 12.7 | [12.6, 12.8] | 1000 |
| 2 | synergy_v3 | 12.9 | [12.8, 13.0] | 1000 |

| difference | estimate | 95% interval | excludes 0 |
|---|---|---|---|
| synergy_v2 - synergy_v3 | -0.2 | [-0.3, -0.1] | yes |

Differences whose interval excludes 0: synergy_v2 - synergy_v3 -0.2.

