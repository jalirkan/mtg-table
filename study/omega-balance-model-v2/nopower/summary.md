# balance-model v2 (D475): drafted context, the drafter's own decks, a robust generator

## Which values: CV by draft over every drafted game

32777 drafted games (32777 scored held out, every draft on one side). Brier score, lower is better:

| values | held-out Brier |
|---|---|
| makeup groups and the play only | 0.24806 |
| census values x alpha | 0.24501 |
| drafted values alone (lambda 800) | 0.24253 |
| **blend**: drafted terms shrunk toward alpha x census (lambda 1600) | **0.24193** |

Chosen: **blend**. alpha (drafted value per census point): legacy 0.948, pauper 0.827.

## The validation: each measured cube predicted without its night (and without its cube)

RMSE over the five colours and the pairs with 400+ deck-games. v1 = census values on J145's analytic mix (D473, the prediction of record). **v2** = drafted-context values refitted without the held-out data, on the mix, play curve and concentration the lab drafter shows on the cube (its own decks for it, simulated at fresh seeds: no game of the night). The other columns take it apart: v2 without the concentration factor; v2's values summed over the drafter's simulated decks, and over the decks the night actually drafted (the oracle mix); census values on v2's mix with concentration, on the drafter's decks and on the night's own.

| held out | night / cube | v1 | **v2** | v2, no concentration | v2 values, drafter's decks | v2 values, the night's own decks | census, v2 mix + concentration | census, drafter's decks | census, the night's own decks | U measured / v1 / v2 |
|---|---|---|---|---|---|---|---|---|---|---|
| night | lab-j145 / omega-cube-180 | 0.018 / 0.024 | **0.007 / 0.018** | 0.009 / 0.021 | 0.009 / 0.015 | 0.010 / 0.014 | 0.016 / 0.019 | 0.020 / 0.034 | 0.021 / 0.033 | 0.480 / 0.448 / 0.478 |
| cube | lab-j145 / omega-cube-180 | 0.018 / 0.024 | **0.018 / 0.024** | 0.021 / 0.029 | 0.026 / 0.037 | 0.026 / 0.035 | 0.016 / 0.019 | 0.020 / 0.034 | 0.021 / 0.033 | 0.480 / 0.448 / 0.449 |
| nothing (in-sample) | lab-j145 / omega-cube-180 | 0.018 / 0.024 | **0.007 / 0.019** | 0.010 / 0.021 | 0.007 / 0.013 | 0.007 / 0.012 | 0.016 / 0.019 | 0.020 / 0.034 | 0.021 / 0.033 | 0.480 / 0.448 / 0.479 |
| night | lab-j159 / omega-cube-180 | 0.017 / 0.021 | **0.007 / 0.017** | 0.008 / 0.020 | 0.008 / 0.013 | 0.008 / 0.012 | 0.018 / 0.018 | 0.018 / 0.033 | 0.019 / 0.035 | 0.477 / 0.448 / 0.476 |
| cube | lab-j159 / omega-cube-180 | 0.017 / 0.021 | **0.014 / 0.020** | 0.016 / 0.023 | 0.020 / 0.034 | 0.022 / 0.034 | 0.018 / 0.018 | 0.018 / 0.033 | 0.019 / 0.035 | 0.477 / 0.448 / 0.449 |
| nothing (in-sample) | lab-j159 / omega-cube-180 | 0.017 / 0.021 | **0.005 / 0.015** | 0.004 / 0.016 | 0.004 / 0.011 | 0.004 / 0.010 | 0.018 / 0.018 | 0.018 / 0.033 | 0.019 / 0.035 | 0.477 / 0.448 / 0.479 |
| night | lab-j160 / balanced-legacy-even-high-nopower | 0.028 / 0.025 | **0.025 / 0.016** | 0.023 / 0.016 | 0.025 / 0.014 | 0.019 / 0.015 | 0.026 / 0.020 | 0.025 / 0.021 | 0.022 / 0.022 | 0.508 / 0.488 / 0.498 |
| cube | lab-j160 / balanced-legacy-even-high-nopower | 0.028 / 0.025 | **0.018 / 0.020** | 0.017 / 0.017 | 0.021 / 0.020 | 0.015 / 0.020 | 0.026 / 0.020 | 0.025 / 0.021 | 0.022 / 0.022 | 0.508 / 0.488 / 0.527 |
| nothing (in-sample) | lab-j160 / balanced-legacy-even-high-nopower | 0.028 / 0.025 | **0.014 / 0.015** | 0.013 / 0.012 | 0.016 / 0.013 | 0.009 / 0.012 | 0.026 / 0.020 | 0.025 / 0.021 | 0.022 / 0.022 | 0.508 / 0.488 / 0.520 |
| night | lab-j160 / balanced-legacy-even-high | 0.044 / 0.063 | **0.040 / 0.056** | 0.039 / 0.055 | 0.038 / 0.056 | 0.037 / 0.056 | 0.043 / 0.062 | 0.042 / 0.061 | 0.041 / 0.060 | 0.566 / 0.498 / 0.501 |
| cube | lab-j160 / balanced-legacy-even-high | 0.044 / 0.063 | **0.030 / 0.044** | 0.031 / 0.046 | 0.028 / 0.042 | 0.028 / 0.043 | 0.043 / 0.062 | 0.042 / 0.061 | 0.041 / 0.060 | 0.566 / 0.498 / 0.517 |
| nothing (in-sample) | lab-j160 / balanced-legacy-even-high | 0.044 / 0.063 | **0.017 / 0.027** | 0.017 / 0.026 | 0.010 / 0.019 | 0.008 / 0.017 | 0.043 / 0.062 | 0.042 / 0.061 | 0.041 / 0.060 | 0.566 / 0.498 / 0.546 |
| night | lab-j160 / balanced-legacy-even-mid-nopower | 0.027 / 0.040 | **0.026 / 0.037** | 0.026 / 0.037 | 0.024 / 0.036 | 0.023 / 0.035 | 0.027 / 0.038 | 0.028 / 0.041 | 0.026 / 0.039 | 0.482 / 0.502 / 0.489 |
| cube | lab-j160 / balanced-legacy-even-mid-nopower | 0.027 / 0.040 | **0.017 / 0.026** | 0.018 / 0.029 | 0.017 / 0.030 | 0.018 / 0.033 | 0.027 / 0.038 | 0.028 / 0.041 | 0.026 / 0.039 | 0.482 / 0.502 / 0.497 |
| nothing (in-sample) | lab-j160 / balanced-legacy-even-mid-nopower | 0.027 / 0.040 | **0.010 / 0.017** | 0.013 / 0.021 | 0.007 / 0.015 | 0.009 / 0.018 | 0.027 / 0.038 | 0.028 / 0.041 | 0.026 / 0.039 | 0.482 / 0.502 / 0.488 |
| night | lab-j160 / balanced-legacy-even-mid | 0.025 / 0.039 | **0.025 / 0.034** | 0.025 / 0.034 | 0.021 / 0.034 | 0.020 / 0.032 | 0.025 / 0.035 | 0.024 / 0.038 | 0.022 / 0.036 | 0.490 / 0.501 / 0.493 |
| cube | lab-j160 / balanced-legacy-even-mid | 0.025 / 0.039 | **0.019 / 0.023** | 0.018 / 0.022 | 0.018 / 0.027 | 0.017 / 0.023 | 0.025 / 0.035 | 0.024 / 0.038 | 0.022 / 0.036 | 0.490 / 0.501 / 0.482 |
| nothing (in-sample) | lab-j160 / balanced-legacy-even-mid | 0.025 / 0.039 | **0.009 / 0.012** | 0.009 / 0.014 | 0.008 / 0.017 | 0.006 / 0.013 | 0.025 / 0.035 | 0.024 / 0.038 | 0.022 / 0.036 | 0.490 / 0.501 / 0.487 |
| night | lab-j160 / balanced-pauper-even | 0.023 / 0.056 | **0.022 / 0.058** | 0.022 / 0.058 | 0.022 / 0.056 | 0.023 / 0.057 | 0.027 / 0.065 | 0.024 / 0.063 | 0.024 / 0.063 | 0.496 / 0.499 / 0.504 |
| cube | lab-j160 / balanced-pauper-even | 0.023 / 0.056 | **0.022 / 0.058** | 0.023 / 0.058 | 0.022 / 0.056 | 0.023 / 0.057 | 0.027 / 0.065 | 0.024 / 0.063 | 0.024 / 0.063 | 0.496 / 0.499 / 0.506 |
| nothing (in-sample) | lab-j160 / balanced-pauper-even | 0.023 / 0.056 | **0.008 / 0.037** | 0.006 / 0.032 | 0.004 / 0.019 | 0.003 / 0.019 | 0.027 / 0.065 | 0.024 / 0.063 | 0.024 / 0.063 | 0.496 / 0.499 / 0.499 |

| pooled | colours | pairs | cells |
|---|---|---|---|
| lab-j145:v1 | 0.018 | 0.024 | 5 + 7 |
| lab-j145:night:v2 | 0.007 | 0.018 | 5 + 7 |
| lab-j145:night:v2noConc | 0.009 | 0.021 | 5 + 7 |
| lab-j145:night:v2decks | 0.009 | 0.015 | 5 + 7 |
| lab-j145:night:v2oracle | 0.010 | 0.014 | 5 + 7 |
| lab-j145:night:censusSimDecks | 0.020 | 0.034 | 5 + 7 |
| lab-j145:night:censusOracle | 0.021 | 0.033 | 5 + 7 |
| lab-j145:night:censusConc | 0.016 | 0.019 | 5 + 7 |
| lab-j145:cube:v2 | 0.018 | 0.024 | 5 + 7 |
| lab-j145:cube:v2noConc | 0.021 | 0.029 | 5 + 7 |
| lab-j145:cube:v2decks | 0.026 | 0.037 | 5 + 7 |
| lab-j145:cube:v2oracle | 0.026 | 0.035 | 5 + 7 |
| lab-j145:cube:censusSimDecks | 0.020 | 0.034 | 5 + 7 |
| lab-j145:cube:censusOracle | 0.021 | 0.033 | 5 + 7 |
| lab-j145:cube:censusConc | 0.016 | 0.019 | 5 + 7 |
| lab-j145:none:v2 | 0.007 | 0.019 | 5 + 7 |
| lab-j145:none:v2noConc | 0.010 | 0.021 | 5 + 7 |
| lab-j145:none:v2decks | 0.007 | 0.013 | 5 + 7 |
| lab-j145:none:v2oracle | 0.007 | 0.012 | 5 + 7 |
| lab-j145:none:censusSimDecks | 0.020 | 0.034 | 5 + 7 |
| lab-j145:none:censusOracle | 0.021 | 0.033 | 5 + 7 |
| lab-j145:none:censusConc | 0.016 | 0.019 | 5 + 7 |
| lab-j159:v1 | 0.017 | 0.021 | 5 + 7 |
| lab-j159:night:v2 | 0.007 | 0.017 | 5 + 7 |
| lab-j159:night:v2noConc | 0.008 | 0.020 | 5 + 7 |
| lab-j159:night:v2decks | 0.008 | 0.013 | 5 + 7 |
| lab-j159:night:v2oracle | 0.008 | 0.012 | 5 + 7 |
| lab-j159:night:censusSimDecks | 0.018 | 0.033 | 5 + 7 |
| lab-j159:night:censusOracle | 0.019 | 0.035 | 5 + 7 |
| lab-j159:night:censusConc | 0.018 | 0.018 | 5 + 7 |
| lab-j159:cube:v2 | 0.014 | 0.020 | 5 + 7 |
| lab-j159:cube:v2noConc | 0.016 | 0.023 | 5 + 7 |
| lab-j159:cube:v2decks | 0.020 | 0.034 | 5 + 7 |
| lab-j159:cube:v2oracle | 0.022 | 0.034 | 5 + 7 |
| lab-j159:cube:censusSimDecks | 0.018 | 0.033 | 5 + 7 |
| lab-j159:cube:censusOracle | 0.019 | 0.035 | 5 + 7 |
| lab-j159:cube:censusConc | 0.018 | 0.018 | 5 + 7 |
| lab-j159:none:v2 | 0.005 | 0.015 | 5 + 7 |
| lab-j159:none:v2noConc | 0.004 | 0.016 | 5 + 7 |
| lab-j159:none:v2decks | 0.004 | 0.011 | 5 + 7 |
| lab-j159:none:v2oracle | 0.004 | 0.010 | 5 + 7 |
| lab-j159:none:censusSimDecks | 0.018 | 0.033 | 5 + 7 |
| lab-j159:none:censusOracle | 0.019 | 0.035 | 5 + 7 |
| lab-j159:none:censusConc | 0.018 | 0.018 | 5 + 7 |
| lab-j160:v1 | 0.030 | 0.047 | 25 + 23 |
| lab-j160:night:v2 | 0.028 | 0.042 | 25 + 23 |
| lab-j160:night:v2noConc | 0.028 | 0.042 | 25 + 23 |
| lab-j160:night:v2decks | 0.027 | 0.042 | 25 + 23 |
| lab-j160:night:v2oracle | 0.025 | 0.042 | 25 + 23 |
| lab-j160:night:censusSimDecks | 0.029 | 0.047 | 25 + 23 |
| lab-j160:night:censusOracle | 0.028 | 0.046 | 25 + 23 |
| lab-j160:night:censusConc | 0.030 | 0.046 | 25 + 23 |
| lab-j160:cube:v2 | 0.022 | 0.036 | 25 + 23 |
| lab-j160:cube:v2noConc | 0.022 | 0.036 | 25 + 23 |
| lab-j160:cube:v2decks | 0.022 | 0.036 | 25 + 23 |
| lab-j160:cube:v2oracle | 0.021 | 0.036 | 25 + 23 |
| lab-j160:cube:censusSimDecks | 0.029 | 0.047 | 25 + 23 |
| lab-j160:cube:censusOracle | 0.028 | 0.046 | 25 + 23 |
| lab-j160:cube:censusConc | 0.030 | 0.046 | 25 + 23 |
| lab-j160:none:v2 | 0.012 | 0.022 | 25 + 23 |
| lab-j160:none:v2noConc | 0.012 | 0.022 | 25 + 23 |
| lab-j160:none:v2decks | 0.010 | 0.017 | 25 + 23 |
| lab-j160:none:v2oracle | 0.007 | 0.016 | 25 + 23 |
| lab-j160:none:censusSimDecks | 0.029 | 0.047 | 25 + 23 |
| lab-j160:none:censusOracle | 0.028 | 0.046 | 25 + 23 |
| lab-j160:none:censusConc | 0.030 | 0.046 | 25 + 23 |

Transfer error left in v2 (night held out): colours 0.021, pairs 0.030 (sqrt(max(0, mean squared night-held-out residual - mean read variance)); the prediction's own bootstrap variance is not subtracted (it is carried separately in the intervals), so this is the transfer error plus the values' noise); the generated cubes' intervals carry 0.021 / 0.030.

## The drafter's mix, by scale

| scale | lab decks | three-colour share | two-colour: a colour / gold / colourless / splash | three-colour: a colour / gold / colourless | play curve |
|---|---|---|---|---|---|
| legacy | 23982 | 0.186 | 8.39 / 0.58 / 5.32 / 0.32 | 5.63 / 1.28 / 4.84 | -0.267 + 0.0087 x rating |
| pauper | 3998 | 0.707 | 8.07 / 0.65 / 4.71 / 1.50 | 5.93 / 0.81 / 4.41 | -0.140 + 0.0079 x rating |

v1's mix (J145): 9.13 a colour, 0.45 gold, 4.18 colourless, no three-colour deck.

| night / cube | k = 1 / 2 / 3 | three-colour share |
|---|---|---|
| lab-j145 / omega-cube-180 | 1 / 3841 / 158 | 0.040 |
| lab-j159 / omega-cube-180 | 2 / 3836 / 162 | 0.041 |
| lab-j160 / balanced-legacy-even-high-nopower | 3 / 3247 / 750 | 0.188 |
| lab-j160 / balanced-legacy-even-high | 2 / 3401 / 597 | 0.149 |
| lab-j160 / balanced-legacy-even-mid-nopower | 8 / 2618 / 1374 | 0.344 |
| lab-j160 / balanced-legacy-even-mid | 2 / 2583 / 1415 | 0.354 |
| lab-j160 / balanced-pauper-even | 2 / 1173 / 2825 | 0.707 |

## Draft concentration: the most-concentrated cards (measured play share over the curve's share)

| night / cube | card | colours | rating | share of its colours' decks | concentration |
|---|---|---|---|---|---|
| lab-j160 / balanced-pauper-even | Writhing Chrysalis | RG | 94 | 0.727 | 3.07 |
| lab-j145 / omega-cube-180 | Baleful Strix | UB | 54 | 0.286 | 2.57 |
| lab-j160 / balanced-legacy-even-high | Wan Shi Tong, Librarian | U | 49 | 0.334 | 2.44 |
| lab-j160 / balanced-pauper-even | Ninja of the Deep Hours | U | 38 | 0.306 | 2.43 |
| lab-j160 / balanced-legacy-even-high | Otharri, Suns' Glory | WR | 97 | 0.640 | 2.42 |
| lab-j160 / balanced-pauper-even | Myr Sire | C | 23 | 0.126 | 2.41 |
| lab-j160 / balanced-legacy-even-high-nopower | Otharri, Suns' Glory | WR | 97 | 0.622 | 2.40 |
| lab-j160 / balanced-legacy-even-high-nopower | Wan Shi Tong, Librarian | U | 49 | 0.368 | 2.28 |
| lab-j160 / balanced-legacy-even-mid-nopower | Sai, Master Thopterist | U | 50 | 0.298 | 2.19 |
| lab-j160 / balanced-legacy-even-high-nopower | Forth Eorlingas! | WR | 99 | 0.574 | 2.13 |
| lab-j160 / balanced-legacy-even-mid-nopower | Thieving Skydiver | U | 53 | 0.323 | 2.10 |
| lab-j160 / balanced-legacy-even-mid | Smuggler's Copter | C | 49 | 0.323 | 2.07 |
| lab-j160 / balanced-legacy-even-mid-nopower | Smuggler's Copter | C | 49 | 0.318 | 2.06 |
| lab-j160 / balanced-pauper-even | Moon-Circuit Hacker | U | 34 | 0.211 | 2.05 |
| lab-j160 / balanced-legacy-even-high | Sword of Light and Shadow | C | 50 | 0.289 | 2.05 |
| lab-j160 / balanced-legacy-even-high | Ancestral Recall | U | 100 | 0.511 | 0.98 |
| lab-j160 / balanced-legacy-even-high | Time Walk | U | 100 | 0.536 | 1.03 |

## Drafted-context values: the 25 largest moves from the census (cards with 1,000+ drafted deck-games)

| card | colours | rating | census | drafted alone | blend (95%) | drafted deck-games |
|---|---|---|---|---|---|---|
| Sower of Temptation | U | 96 | +1.9 | +4.3 | +4.9 (+3.7 to +5.5) | 12166 |
| The Abyss | B | 75 | -0.5 | -4.2 | -3.3 (-4.4 to -2.1) | 2967 |
| Lotus Petal | C | 99 | -0.3 | -3.5 | -2.9 (-4.0 to -1.5) | 3648 |
| Time Walk | U | 100 | +2.6 | +4.3 | +5.0 (+3.5 to +5.9) | 2416 |
| Barrowgoyf | B | 85 | +2.3 | -1.7 | -0.1 (-1.4 to +0.6) | 3616 |
| Mox Jet | C | 100 | +2.1 | +3.8 | +4.3 (+2.8 to +5.2) | 3546 |
| Man-o'-War | U | 87 | +0.0 | +2.4 | +2.3 (+1.3 to +3.2) | 10378 |
| Ugin, Eye of the Storms | C | 98 | +0.5 | +2.2 | +2.7 (+1.7 to +3.4) | 13974 |
| Wood Elves | G | 82 | -1.0 | -4.0 | -3.2 (-4.5 to -1.8) | 2272 |
| Karn, Scion of Urza | C | 58 | -0.0 | +1.8 | +2.1 (+1.1 to +2.7) | 12221 |
| Skullclamp | C | 99 | +0.2 | -2.6 | -1.9 (-3.0 to -1.3) | 11182 |
| Black Lotus | C | 100 | +2.1 | +3.6 | +4.2 (+2.8 to +5.0) | 3516 |
| Serra Paragon | W | 50 | -0.1 | +2.3 | +1.9 (+0.5 to +3.1) | 2068 |
| Cryptic Command | U | 54 | +0.5 | -2.4 | -1.5 (-2.9 to -0.8) | 3935 |
| Bone Shards | B | 86 | +0.0 | -2.8 | -1.9 (-3.1 to -0.8) | 4628 |
| Nissa, Who Shakes the World | G | 79 | +0.1 | +1.8 | +1.9 (+0.5 to +3.0) | 5003 |
| Tarmogoyf | G | 86 | +2.5 | -0.8 | +0.7 (-0.8 to +1.5) | 4012 |
| Prodigal Sorcerer | U | 45 | +1.9 | -1.0 | +0.2 (-1.3 to +1.3) | 1848 |
| Cori-Steel Cutter | R | 98 | +0.3 | -2.1 | -1.4 (-2.5 to -0.6) | 7332 |
| Grim Haruspex | B | 73 | -0.1 | -2.5 | -1.7 (-3.1 to -0.5) | 3295 |
| Exalted Angel | W | 95 | +3.2 | +0.3 | +1.5 (+0.2 to +2.3) | 6536 |
| Wheel of Fortune | R | 99 | -0.3 | -2.6 | -1.9 (-3.1 to -0.9) | 4122 |
| Batterskull | C | 50 | +1.6 | +2.7 | +3.3 (+2.0 to +4.2) | 5402 |
| Ancestral Recall | U | 100 | +1.4 | +2.2 | +3.0 (+1.4 to +4.1) | 2276 |
| Overlord of the Balemurk | B | 85 | +0.4 | -1.8 | -1.1 (-2.4 to -0.2) | 3908 |

## The generated cubes (v2)

Cells from the lab drafter's own decks for each cube (2,000 simulated drafts); intervals hold the values' bootstrap and the transfer error. The gap is max |colour − .5| + max |pair − .5| over the pairs a night would judge; "robust" is its mean over held-out replicates, "with transfer" adds the validation's transfer error to each cell.

| cube | level | search | gap, point | gap, robust (95%) | gap with transfer (95%) | flow alone: robust / with transfer | three-colour decks |
|---|---|---|---|---|---|---|---|
| balanced-v2-legacy-even-high-nopower | +2.0 | 6 swaps kept | 0.055 | 0.058 (0.034–0.095) | 0.100 (0.058–0.159) | 0.079 / 0.111 | 0.171 |
| balanced-v2-legacy-even-mid-nopower | +0.0 | flow kept (1 tried) | 0.040 | 0.049 (0.026–0.071) | 0.091 (0.049–0.145) | 0.048 / 0.092 | 0.175 |
| balanced-v2-pauper-even-nopower | +0.0 | 11 swaps kept | 0.052 | 0.054 (0.031–0.081) | 0.090 (0.044–0.146) | 0.119 / 0.135 | 0.648 |

### balanced-v2-legacy-even-high-nopower

| cell | predicted | 95% with transfer | deck-games at a 2,000-draft night |
|---|---|---|---|
| W | 0.504 | 0.458–0.550 | 2706 |
| U | 0.489 | 0.444–0.534 | 2700 |
| B | 0.472 | 0.425–0.519 | 734 |
| R | 0.497 | 0.451–0.542 | 2380 |
| G | 0.507 | 0.461–0.554 | 2532 |
| WU | 0.513 | 0.451–0.575 | 756 |
| WB | 0.494 | 0.432–0.556 | 82 |
| WR | 0.527 | 0.465–0.589 | 1160 |
| WG | 0.533 | 0.470–0.596 | 324 |
| UB | 0.488 | 0.425–0.551 | 222 |
| UR | 0.514 | 0.452–0.575 | 1896 |
| UG | 0.512 | 0.451–0.574 | 1028 |
| BR | 0.486 | 0.424–0.549 | 172 |
| BG | 0.511 | 0.448–0.573 | 72 |
| RG | 0.521 | 0.459–0.583 | 764 |

### balanced-v2-legacy-even-mid-nopower

| cell | predicted | 95% with transfer | deck-games at a 2,000-draft night |
|---|---|---|---|
| W | 0.501 | 0.454–0.548 | 2740 |
| U | 0.479 | 0.433–0.525 | 1600 |
| B | 0.487 | 0.440–0.533 | 2920 |
| R | 0.485 | 0.438–0.532 | 84 |
| G | 0.518 | 0.472–0.564 | 2324 |
| WU | 0.503 | 0.441–0.565 | 2370 |
| WB | 0.510 | 0.446–0.573 | 856 |
| WR | 0.509 | 0.446–0.572 | 4 |
| WG | 0.538 | 0.475–0.601 | 314 |
| UB | 0.490 | 0.427–0.552 | 1464 |
| UR | 0.486 | 0.423–0.549 | 44 |
| UG | 0.519 | 0.456–0.582 | 976 |
| BR | 0.495 | 0.432–0.557 | 0 |
| BG | 0.525 | 0.462–0.587 | 320 |
| RG | 0.525 | 0.462–0.588 | 0 |

### balanced-v2-pauper-even-nopower

| cell | predicted | 95% with transfer | deck-games at a 2,000-draft night |
|---|---|---|---|
| W | 0.496 | 0.449–0.544 | 2872 |
| U | 0.467 | 0.421–0.513 | 1366 |
| B | 0.499 | 0.452–0.545 | 2654 |
| R | 0.495 | 0.448–0.543 | 2804 |
| G | 0.518 | 0.464–0.571 | 1088 |
| WU | 0.494 | 0.428–0.560 | 630 |
| WB | 0.522 | 0.454–0.590 | 142 |
| WR | 0.523 | 0.455–0.591 | 74 |
| WG | 0.538 | 0.470–0.607 | 4 |
| UB | 0.501 | 0.435–0.567 | 752 |
| UR | 0.481 | 0.416–0.546 | 908 |
| UG | 0.511 | 0.442–0.579 | 46 |
| BR | 0.519 | 0.450–0.587 | 226 |
| BG | 0.542 | 0.473–0.612 | 10 |
| RG | 0.551 | 0.484–0.619 | 12 |
