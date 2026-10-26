# The sizing read, J169 (labels.json, labels-*.json; Poisson column mine)

Confident labels per 7-worker 10-h night at the measured walls (checks included, re-check walls apart), scaled from the
6-worker walls. Poisson 95%: the exact (Garwood) interval on the confident count, scaled by the same factor; J168's
20.5-45.2 on 27 is reproduced by this method.

| read | spines | labels | confident | labels / night | **confident / night** | Poisson 95% |
|---|---|---|---|---|---|---|
| **all 13 as run** (`c_sizingRead`) | 13 | 97 | 27 | 110 | **30.7** | 20.2-44.7 |
| **s05 out, the headline** (`c_sizingReadUnbiased`) | 12 | 89 | 26 | 110 | **32.0** | 20.9-46.9 |
| all 13, s05 d8 voided (mine) | 13 | 97 | 26 | 110 | 29.6 | 19.3-43.3 |
| the two D485 spines alone (labels-d485.json) | 2 | 16 | 9 | 83 | 46.7 | 21.4-88.7 |
| the ten D483 spines (labels-d483.json) | 10 | 75 | 23 | 107 | 32.9 | 20.9-49.4 |
| the nine D484 spines (labels-d484.json) | 9 | 72 | 23 | 111 | 35.4 | 22.4-53.1 |
| J168, all 13 | 13 | 97 | 27 | 112 | 31.1 | 20.5-45.2 |
| J168, s05 out | 12 | | | | 32.4 | |
| J168's read, strict (6 doubtful out) / middle (3 out) | | | 21 / 24 | | 24.2 / 27.6 | |
| J166 s01-s03 | 3 | 22 | 4 | 122 | 22.3 | |
| the review's expectation | | | | | ~25-27 | |

- The night moved 31.1 -> 30.7 only because s06's and s10's walls grew (75.3 -> 79.5 min, 52.3 -> 55.4 min); labels
  and confident labels per spine are J168's exactly (s06 8 / 5, s10 8 / 4).
- J168's strict and middle reads (24.2, 27.6) took out labels the re-branch keeps; with D485 the doubtful set is s05 d8
  alone, so 29.6 (all 13) to 32.0 (s05 out) is the range for this population.
- Confident share 0.278 [0.142, 0.449] (all 13), 0.292 [0.145, 0.461] (s05 out); by pool: peasant 10 / 22, powered 6 / 19,
  pauper 7 / 32, legacy 4 / 24.
