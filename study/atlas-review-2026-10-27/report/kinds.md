# (4) What is listed, what is branched

Listed = every decision of the viewing seat (A) in the baseline game with 2+ options (the atlas lists priority, attack and block decisions only: no mulligan, no target decision is ever an atlas decision). k = distinct plays for branched decisions (D483), distinct identities for the listing.

| seat | kind | listed | listed k>=3 | branched | share of listed | branched / listed k>=3 | screened | complete | confident | wh a complete decision |
|---|---|---|---|---|---|---|---|---|---|---|
| old | priority | 198 | 111 | 92 | 0.46 | 0.83 | 20 | 72 | 18 | 0.55 |
| old | attack | 71 | 40 | 33 | 0.46 | 0.82 | 10 | 23 | 8 | 0.44 |
| old | block | 17 | 13 | 11 | 0.65 | 0.85 | 9 | 2 | 1 | 0.71 |
| D486 | priority | 196 | 109 | 96 | 0.49 | 0.88 | 26 | 70 | 21 | 0.56 |
| D486 | attack | 71 | 40 | 39 | 0.55 | 0.97 | 11 | 28 | 5 | 0.44 |
| D486 | block | 17 | 13 | 12 | 0.71 | 0.92 | 9 | 3 | 2 | 0.73 |
| D488 | priority | 45 | 25 | 24 | 0.53 | 0.96 | 10 | 14 | 6 | 0.29 |
| D488 | attack | 17 | 5 | 9 | 0.53 | 1.80 | 3 | 6 | 2 | 0.11 |
| D488 | block | 9 | 4 | 6 | 0.67 | 1.50 | 2 | 4 | 1 | 0.25 |

- attack: branched 81, screened 24 (30%); median turn 13; priority's screened share 26%.
- block: branched 29, screened 20 (69%); median turn 15; priority's screened share 26%.

- old: listed attack+block decisions a spine [2, 1, 6, 6, 3, 7, 7, 4, 11, 13, 10, 4, 14] (mean 6.8); with k >= 3 [0, 0, 2, 3, 2, 2, 4, 3, 5, 11, 7, 3, 11] (mean 4.1).
- D486: listed attack+block decisions a spine [2, 1, 6, 6, 3, 7, 7, 4, 11, 13, 10, 4, 14] (mean 6.8); with k >= 3 [0, 0, 2, 3, 2, 2, 4, 3, 5, 11, 7, 3, 11] (mean 4.1).
- D488: listed attack+block decisions a spine [7, 13, 6] (mean 8.7); with k >= 3 [3, 5, 1] (mean 3.0).

## Every confident attack or block label

| seat | spine | d | kind | k | turn | Forge's (o0) | best | regret | lo | hi |
|---|---|---|---|---|---|---|---|---|---|---|
| old | s02 | 3 | attack | 2 | 7 | attack:25 | attack:none | 0.13 | 0.05 | 0.21 |
| old | s07 | 7 | attack | 3 | 8 | attack:10 | attack:10,12 | 0.04 | 0.01 | 0.07 |
| old | s08 | 12 | attack | 4 | 9 | attack:none | attack:3,17 | 0.10 | 0.05 | 0.16 |
| old | s09 | 12 | attack | 7 | 16 | attack:4 | attack:4,33,34,40,87 | 0.08 | 0.01 | 0.18 |
| old | s09 | 13 | block | 6 | 17 | block:none | block:40>70 | 0.23 | 0.14 | 0.31 |
| old | s10 | 15 | attack | 4 | 13 | attack:none | attack:10,28 | 0.07 | 0.01 | 0.15 |
| old | s10 | 28 | attack | 5 | 21 | attack:14 | attack:14,27,28 | 0.09 | 0.01 | 0.18 |
| old | s12 | 13 | attack | 3 | 11 | attack:37 | attack:29,37 | 0.24 | 0.15 | 0.32 |
| old | s13 | 15 | attack | 6 | 14 | attack:38 | attack:27,28,37,38 | 0.14 | 0.07 | 0.22 |
| D486 | s08 | 12 | attack | 4 | 9 | attack:none | attack:3,17 | 0.07 | 0.02 | 0.14 |
| D486 | s09 | 13 | block | 6 | 17 | block:none | block:40>70 | 0.16 | 0.08 | 0.25 |
| D486 | s10 | 15 | attack | 4 | 13 | attack:none | attack:10,28 | 0.10 | 0.04 | 0.17 |
| D486 | s11 | 12 | attack | 4 | 12 | attack:none | attack:3 | 0.10 | 0.04 | 0.18 |
| D486 | s11 | 14 | block | 6 | 13 | block:3>85 | block:83>47,3>85 | 0.04 | 0.01 | 0.10 |
| D486 | s12 | 13 | attack | 3 | 11 | attack:37 | attack:29,37 | 0.23 | 0.14 | 0.32 |
| D486 | s13 | 15 | attack | 6 | 14 | attack:38 | attack:27,28,37,38 | 0.14 | 0.07 | 0.21 |
| D488 | s02 | 7 | attack | 4 | 8 | attack:7,22 | attack:22 | 0.10 | 0.06 | 0.14 |
| D488 | s02 | 24 | block | 4 | 17 | block:2>57,4>57 | block:4>57 | 0.01 | 0.00 | 0.02 |
| D488 | s03 | 11 | attack | 2 | 11 | attack:none | attack:26 | 0.04 | 0.01 | 0.07 |

## s02 d3 (the attack J166 labelled) on each seat

- old: kind a, k 2, turn 7, regret 0.1325 [0.0525, 0.2125], confident True, options [('attack:25', 0.4175), ('attack:none', 0.55)]
- D486: kind a, k 2, turn 7, regret 0.015 [0, 0.1001], confident False, options [('attack:25', 0.455), ('attack:none', 0.47)]
