**Forge-pilot caveat:** Every game is piloted by Forge's Default AI on both seats, and every deck is the lab drafter's and builder's; the model predicts exactly that and nothing about people.

# J160: the library model tested -- predicted against measured, per generated cube

The registered reads (written before any game): (i) the transfer error, RMSE(pred, measured) over the five colours and the pairs with 400+ arm-B deck-games, per cube and pooled; (ii) the selection bias, the measured max pair gap minus the predicted searched gap; (iii) the power effect, the max colour gap with power minus without; (iv) a candidate (D447 point 9), a cube with no colour OFF and no qualifying pair OFF on this night alone. No cube is promoted, swapped or regenerated.

**(i) Transfer error, pooled over 5 cube(s):** colours RMSE 0.030 (max 0.068, transfer SD 0.021, n 25); qualifying pairs RMSE 0.047 (max 0.102, transfer SD 0.038, n 23); cells missed beyond both intervals: 4 colour(s), 8 pair(s). The programme was simulated at transfer SD 0, .015 and .03.

**(iv) Candidates (no colour OFF, no qualifying pair OFF, this night alone):** balanced-legacy-even-high-nopower. The v2 draft rule's stricter PASS (every colour EVEN, no qualifying pair OFF): none. Confirmed only on fresh seeds later; nothing is promoted.

## Per cube

| cube | games | colour level | (i) RMSE colours / pairs (n pairs) | transfer SD colours / pairs | (ii) measured max pair gap | predicted searched gap | selection bias | noise-only expected gap (share >= measured) | objective: measured / flow-only / searched | (iv) |
|---|---|---|---|---|---|---|---|---|---|---|
| balanced-legacy-even-high | 4000 | NOT BALANCED ON PAYOFF | 0.044 / 0.063 (6) | 0.039 / 0.058 | 0.100 | 0.004 | +0.096 | 0.033 (0.000) | 0.165 / 0.114 / 0.007 | no |
| balanced-legacy-even-high-nopower | 4000 | BALANCED ON PAYOFF | 0.028 / 0.025 (5) | 0.020 / 0.002 | 0.043 | 0.011 | +0.032 | 0.030 (0.119) | 0.092 / 0.148 / 0.024 | CANDIDATE |
| balanced-legacy-even-mid | 3988 | BALANCED ON PAYOFF | 0.025 / 0.039 (4) | 0.013 / 0.031 | 0.075 | 0.003 | +0.073 | 0.026 (0.001) | 0.114 / 0.030 / 0.006 | no |
| balanced-legacy-even-mid-nopower | 3989 | BALANCED ON PAYOFF | 0.027 / 0.040 (5) | 0.018 / 0.030 | 0.060 | 0.003 | +0.058 | 0.031 (0.031) | 0.105 / 0.032 / 0.007 | no |
| balanced-pauper-even | 4000 | BALANCED ON PAYOFF | 0.023 / 0.056 (3) | 0.000 / 0.044 | 0.079 | 0.008 | +0.071 | 0.029 (0.001) | 0.116 / 0.163 / 0.008 | no |
| omega-j159 (reference) | 4000 | BALANCED ON PAYOFF | 0.017 / 0.021 (7) | 0.000 / 0.000 | 0.047 | 0.060 | -0.013 | 0.067 (0.891) | 0.077 / - / - | CANDIDATE |

## (iii) The power effect: max colour gap with power minus without

| family | with | without | measured diff (95%) | predicted diff | pair-gap diff |
|---|---|---|---|---|---|
| balanced-legacy-even-high | 0.066 | 0.049 | +0.017 (-0.015 to +0.047) | -0.009 | +0.056 |
| balanced-legacy-even-mid | 0.038 | 0.045 | -0.006 (-0.027 to +0.023) | -0.000 | +0.015 |
| balanced-pauper-even | - | - | n/a: no -nopower cube measured | - | - |

### balanced-legacy-even-high

| cell | predicted | measured (95%) | n | label | measured - predicted | qualifies |
|---|---|---|---|---|---|---|
| W | 0.501 | 0.478 (0.459-0.498) | 2734 | EVEN | -0.022 | yes |
| U | 0.498 | 0.566 (0.546-0.583) | 2830 | OFF | +0.068 | yes |
| B | 0.499 | 0.470 (0.445-0.495) | 1482 | UNCLEAR | -0.029 | yes |
| R | 0.499 | 0.446 (0.426-0.468) | 2338 | OFF | -0.053 | yes |
| G | 0.503 | 0.474 (0.451-0.497) | 1906 | EVEN | -0.029 | yes |
| WU | 0.498 | 0.600 (0.567-0.634) | 852 | OFF | +0.102 | yes |
| WB | 0.497 | 0.471 (0.396-0.548) | 174 | UNCLEAR | -0.026 | no |
| WR | 0.504 | 0.455 (0.431-0.482) | 1522 | UNCLEAR | -0.049 | yes |
| WG | 0.503 | 0.491 (0.439-0.545) | 324 | UNCLEAR | -0.012 | no |
| UB | 0.498 | 0.545 (0.500-0.591) | 508 | UNCLEAR | +0.047 | yes |
| UR | 0.496 | 0.547 (0.524-0.571) | 1830 | UNCLEAR | +0.051 | yes |
| UG | 0.502 | 0.557 (0.511-0.602) | 456 | OFF | +0.055 | yes |
| BR | 0.497 | 0.422 (0.365-0.475) | 306 | OFF | -0.076 | no |
| BG | 0.504 | 0.525 (0.432-0.608) | 120 | UNCLEAR | +0.021 | no |
| RG | 0.501 | 0.442 (0.399-0.488) | 550 | OFF | -0.059 | yes |

### balanced-legacy-even-high-nopower

| cell | predicted | measured (95%) | n | label | measured - predicted | qualifies |
|---|---|---|---|---|---|---|
| W | 0.503 | 0.502 (0.485-0.521) | 2852 | EVEN | -0.001 | yes |
| U | 0.488 | 0.508 (0.488-0.527) | 2590 | EVEN | +0.020 | yes |
| B | 0.503 | 0.451 (0.424-0.481) | 1264 | UNCLEAR | -0.052 | yes |
| R | 0.501 | 0.500 (0.477-0.523) | 1968 | EVEN | -0.001 | yes |
| G | 0.505 | 0.475 (0.457-0.494) | 2792 | EVEN | -0.030 | yes |
| WU | 0.490 | 0.543 (0.480-0.607) | 258 | UNCLEAR | +0.052 | no |
| WB | 0.503 | 0.500 (0.422-0.580) | 180 | UNCLEAR | -0.003 | no |
| WR | 0.511 | 0.524 (0.501-0.547) | 1814 | EVEN | +0.013 | yes |
| WG | 0.504 | 0.502 (0.455-0.547) | 470 | EVEN | -0.002 | yes |
| UB | 0.490 | 0.525 (0.455-0.594) | 198 | UNCLEAR | +0.036 | no |
| UR | 0.489 | 0.543 (0.515-0.570) | 1220 | UNCLEAR | +0.054 | yes |
| UG | 0.498 | 0.505 (0.463-0.544) | 646 | EVEN | +0.007 | yes |
| BR | 0.503 | 0.440 (0.373-0.509) | 248 | UNCLEAR | -0.064 | no |
| BG | 0.511 | 0.462 (0.398-0.526) | 210 | UNCLEAR | -0.049 | no |
| RG | 0.500 | 0.507 (0.478-0.536) | 1190 | EVEN | +0.007 | yes |

### balanced-legacy-even-mid

| cell | predicted | measured (95%) | n | label | measured - predicted | qualifies |
|---|---|---|---|---|---|---|
| W | 0.502 | 0.491 (0.472-0.508) | 2747 | EVEN | -0.011 | yes |
| U | 0.501 | 0.490 (0.460-0.523) | 1111 | EVEN | -0.010 | yes |
| B | 0.500 | 0.487 (0.468-0.505) | 2876 | EVEN | -0.013 | yes |
| R | 0.497 | 0.462 (0.441-0.480) | 2540 | UNCLEAR | -0.035 | yes |
| G | 0.500 | 0.538 (0.512-0.562) | 1599 | UNCLEAR | +0.038 | yes |
| WU | 0.502 | 0.523 (0.496-0.551) | 1282 | UNCLEAR | +0.021 | yes |
| WB | 0.503 | 0.539 (0.481-0.592) | 306 | UNCLEAR | +0.036 | no |
| WR | 0.498 | 0.423 (0.275-0.577) | 52 | UNCLEAR | -0.075 | no |
| WG | 0.502 | 0.551 (0.450-0.662) | 78 | UNCLEAR | +0.049 | no |
| UB | 0.502 | 0.508 (0.483-0.534) | 1487 | EVEN | +0.006 | yes |
| UR | 0.497 | 0.485 (0.445-0.523) | 751 | UNCLEAR | -0.013 | yes |
| UG | 0.501 | 0.575 (0.534-0.615) | 676 | OFF | +0.075 | yes |
| BR | 0.497 | 0.506 (0.432-0.575) | 178 | UNCLEAR | +0.008 | no |
| BG | 0.499 | 0.567 (0.494-0.634) | 217 | UNCLEAR | +0.068 | no |
| RG | 0.499 | 0.574 (0.448-0.696) | 54 | UNCLEAR | +0.075 | no |

### balanced-legacy-even-mid-nopower

| cell | predicted | measured (95%) | n | label | measured - predicted | qualifies |
|---|---|---|---|---|---|---|
| W | 0.500 | 0.521 (0.503-0.541) | 2776 | EVEN | +0.021 | yes |
| U | 0.502 | 0.482 (0.454-0.508) | 1389 | EVEN | -0.020 | yes |
| B | 0.500 | 0.474 (0.455-0.494) | 2800 | EVEN | -0.026 | yes |
| R | 0.497 | 0.455 (0.435-0.474) | 2446 | UNCLEAR | -0.041 | yes |
| G | 0.501 | 0.523 (0.492-0.551) | 1290 | UNCLEAR | +0.022 | yes |
| WU | 0.502 | 0.560 (0.534-0.586) | 1622 | OFF | +0.059 | yes |
| WB | 0.501 | 0.512 (0.472-0.554) | 578 | UNCLEAR | +0.011 | yes |
| WR | 0.496 | 0.633 (0.515-0.744) | 79 | OFF | +0.136 | no |
| WG | 0.502 | 0.567 (0.472-0.662) | 120 | UNCLEAR | +0.065 | no |
| UB | 0.502 | 0.486 (0.458-0.514) | 1284 | EVEN | -0.016 | yes |
| UR | 0.498 | 0.466 (0.424-0.503) | 640 | UNCLEAR | -0.033 | yes |
| UG | 0.503 | 0.557 (0.505-0.603) | 472 | OFF | +0.054 | yes |
| BR | 0.497 | 0.522 (0.421-0.625) | 115 | UNCLEAR | +0.025 | no |
| BG | 0.499 | 0.540 (0.471-0.608) | 211 | UNCLEAR | +0.041 | no |
| RG | 0.499 | 0.533 (0.375-0.682) | 30 | UNCLEAR | +0.034 | no |

### balanced-pauper-even

| cell | predicted | measured (95%) | n | label | measured - predicted | qualifies |
|---|---|---|---|---|---|---|
| W | 0.501 | 0.534 (0.514-0.554) | 2722 | UNCLEAR | +0.034 | yes |
| U | 0.499 | 0.496 (0.467-0.524) | 1446 | EVEN | -0.003 | yes |
| B | 0.500 | 0.500 (0.481-0.520) | 2748 | EVEN | +0.001 | yes |
| R | 0.500 | 0.462 (0.442-0.482) | 2870 | UNCLEAR | -0.037 | yes |
| G | 0.501 | 0.493 (0.472-0.514) | 2396 | EVEN | -0.008 | yes |
| WU | 0.503 | 0.579 (0.536-0.619) | 636 | OFF | +0.076 | yes |
| WB | 0.497 | 0.660 (0.557-0.750) | 94 | OFF | +0.163 | no |
| WR | 0.500 | 0.551 (0.449-0.652) | 118 | UNCLEAR | +0.051 | no |
| WG | 0.502 | 0.706 (0.550-0.846) | 34 | OFF | +0.204 | no |
| UB | 0.508 | 0.513 (0.465-0.556) | 472 | UNCLEAR | +0.005 | yes |
| UR | 0.495 | 0.434 (0.396-0.475) | 730 | OFF | -0.061 | yes |
| UG | 0.493 | 0.534 (0.444-0.632) | 118 | UNCLEAR | +0.041 | no |
| BR | 0.497 | 0.447 (0.356-0.538) | 114 | UNCLEAR | -0.049 | no |
| BG | 0.499 | 0.400 (0.000-0.750) | 10 | UNCLEAR | -0.099 | no |
| RG | 0.508 | 0.550 (0.250-0.833) | 20 | UNCLEAR | +0.042 | no |

### omega-j159 (reference, never pooled)

| cell | predicted | measured (95%) | n | label | measured - predicted | qualifies |
|---|---|---|---|---|---|---|
| W | 0.512 | 0.505 (0.485-0.524) | 2898 | EVEN | -0.007 | yes |
| U | 0.448 | 0.477 (0.458-0.496) | 2804 | EVEN | +0.029 | yes |
| B | 0.526 | 0.501 (0.481-0.520) | 2604 | EVEN | -0.024 | yes |
| R | 0.528 | 0.530 (0.509-0.552) | 2220 | UNCLEAR | +0.003 | yes |
| G | 0.487 | 0.481 (0.458-0.503) | 1930 | EVEN | -0.006 | yes |
| WU | 0.468 | 0.492 (0.466-0.519) | 1568 | EVEN | +0.025 | yes |
| WB | 0.529 | 0.544 (0.502-0.585) | 616 | UNCLEAR | +0.015 | yes |
| WR | 0.538 | 0.530 (0.496-0.565) | 826 | UNCLEAR | -0.008 | yes |
| WG | 0.498 | 0.473 (0.433-0.511) | 662 | UNCLEAR | -0.025 | yes |
| UB | 0.480 | 0.483 (0.456-0.508) | 1578 | EVEN | +0.003 | yes |
| UR | 0.474 | 0.511 (0.475-0.545) | 788 | EVEN | +0.037 | yes |
| UG | 0.440 | 0.453 (0.406-0.500) | 470 | UNCLEAR | +0.013 | yes |
| BR | 0.547 | 0.582 (0.522-0.647) | 280 | OFF | +0.035 | no |
| BG | 0.512 | 0.487 (0.434-0.540) | 388 | UNCLEAR | -0.025 | no |
| RG | 0.515 | 0.542 (0.493-0.589) | 380 | UNCLEAR | +0.027 | no |
