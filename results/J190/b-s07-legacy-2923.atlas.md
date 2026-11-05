# Move atlas: legacy-2823-00001 vs legacy-2823-00002, seed 2923

D451. Seat A is legacy-2823-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 16 turns, won by A, and listed 21 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 4 | p | 3 | 2 `cast:6`, 2.3 [0.0, 12.7] (n 150) | 1 `cast:17`, 2.5 [0.0, 17.5] (n 40) | 0.87 [-1.00, 1.00] | no |
| d1 | 4 | p | 3 | 0 `cast:17`, 0.0 [0.0, 7.3] (n 150) | 2 `cast:6`, 2.5 [0.0, 12.5] (n 40) | 0.50 [-0.87, 1.00] | no |
| d4 | 10 | p | 2 | 0 `cast:14`, 0.0 [0.0, 0.4] (n 150) | 0 `cast:14`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d5 | 10 | p | 2 | 0 `pass`, 0.0 [0.0, 7.3] (n 150) | 1 `cast:1`, 5.0 [0.0, 17.5] (n 40) | - [-1.00, 1.00] | no |
| d6 | 10 | p | 2 | 0 `cast:1`, 0.0 [0.0, 6.0] (n 50) | -, - (n 0) | - | - |
| d7 | 10 | p | 3 | 0 `activate:1#1`, 0.0 [0.0, 7.0] (n 50) | -, - (n 0) | - | - |
| d8 | 12 | p | 3 | 2 `cast:26`, 1.0 [0.0, 8.0] (n 150) | 1 `pass`, 3.8 [0.0, 10.0] (n 40) | -1.00 [-1.00, 0.00] | no |
| d9 | 12 | p | 2 | 0 `pass`, 0.0 [0.0, 1.0] (n 150) | 0 `pass`, 0.0 [0.0, 2.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d10 | 12 | a | 2 | 0 `attack:154`, 0.0 [0.0, 1.0] (n 50) | -, - (n 0) | - | - |
| d11 | 12 | p | 2 | 0 `cast:26`, 0.0 [0.0, 7.0] (n 50) | -, - (n 0) | - | - |
| d12 | 14 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d13 | 14 | a | 8 | 0 `attack:26,154,172,185,186,187`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d14 | 14 | p | 4 | 0 `activate:1#0`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 14 | p | 4 | 0 `activate:1#1`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d16 | 14 | p | 2 | 0 `cast:4`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d17 | 14 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d18 | 16 | p | 5 | 0 `activate:1#1`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d19 | 16 | p | 4 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d20 | 16 | a | 8 | 0 `attack:4,26,172,185,186,187,223,235,236,237,238`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

19 decision(s) branched, 6 of them in full (4 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 9: d13 (mean value 99.8%, replaced by d10), d14 (mean value 100.0%, replaced by d16), d15 (mean value 100.0%, replaced by d9), d18 (mean value 100.0%, replaced by d5), d19 (mean value 100.0%, replaced by d6), d20 (mean value 100.0%, replaced by d4), d16 (mean value 100.0%, replaced by d17), d17 (mean value 100.0%, replaced by d12), d12 (mean value 100.0%, replaced by d11). Early stopping at 50/100 random branches stopped 1 option(s): d4 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 7. It stopped 4 (d7, d11, d10, d6), each a partial label at that n, never confident, saving at most 1260 branch games; 3 it would have stopped played on to the full n as controls (d1, d9, d4; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

Over 6 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.34 [-0.53, 0.93]; at 0 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 2 of 6 decision(s) (33.3% [9.7, 70.0]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d8 (turn 12, p): rank correlation -1.00 [-1.00, 0.00]; random's best `cast:26`, Forge's best `pass`.
- d1 (turn 4, p): rank correlation 0.50 [-0.87, 1.00]; random's best `cast:17`, Forge's best `cast:6`.
- d0 (turn 4, p): rank correlation 0.87 [-1.00, 1.00]; random's best `cast:6`, Forge's best `cast:17`.
- d9 (turn 12, p): rank correlation 1.00 [-1.00, 1.00]; random's best `pass`, Forge's best `pass`.
- d5 (turn 10, p): rank correlation - [-1.00, 1.00]; random's best `pass`, Forge's best `cast:1`.

### Each decision's options, side by side

**d0** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 53.7 [45.7, 61.5] (n 150) | 42.5 [28.5, 57.8] (n 40) |
| 1 | `cast:17` | Lotus Cobra | 54.3 [46.4, 62.1] (n 150) | 45.0 [30.7, 60.2] (n 40) |
| 2 | `cast:6` | Thing in the Ice | 56.0 [48.0, 63.7] (n 150) | 45.0 [30.7, 60.2] (n 40) |

**d1** (turn 4, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Lotus Cobra | 54.0 [46.0, 61.8] (n 150) | 35.0 [22.1, 50.5] (n 40) |
| 1 | `pass` | pass | 47.3 [39.5, 55.3] (n 150) | 20.0 [10.5, 34.8] (n 40) |
| 2 | `cast:6` | Thing in the Ice | 52.3 [44.4, 60.2] (n 150) | 37.5 [24.2, 53.0] (n 40) |

**d4** (turn 10, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:14` | Mox Ruby | 69.7 [61.9, 76.5] (n 150) | 62.5 [47.0, 75.8] (n 40) |
| 1 | `pass` | pass | 55.0 [41.3, 67.9] (n 50, stopped at 50) | - (n 0) |

**d5** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 70.0 [62.2, 76.8] (n 150) | 60.0 [44.6, 73.7] (n 40) |
| 1 | `cast:1` | Garruk Wildspeaker | 70.0 [62.2, 76.8] (n 150) | 65.0 [49.5, 77.9] (n 40) |

**d6** (turn 10, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Garruk Wildspeaker | 69.0 [55.2, 80.1] (n 50) | - (n 0) |
| 1 | `pass` | pass | 62.0 [48.1, 74.1] (n 50) | - (n 0) |

**d7** (turn 10, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:1#1` | Garruk Wildspeaker: -1: Create a 3/3 green Beast creature to | 71.0 [57.3, 81.7] (n 50) | - (n 0) |
| 1 | `pass` | pass | 62.0 [48.1, 74.1] (n 50) | - (n 0) |
| 2 | `activate:1#0` | Garruk Wildspeaker: +1: Untap two target lands. | 63.0 [49.1, 75.0] (n 50) | - (n 0) |

**d8** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:1#1` | Garruk Wildspeaker: -1: Create a 3/3 green Beast creature to | 83.3 [76.5, 88.4] (n 150) | 88.8 [75.4, 95.3] (n 40) |
| 1 | `pass` | pass | 76.0 [68.6, 82.1] (n 150) | 92.5 [80.1, 97.4] (n 40) |
| 2 | `cast:26` | Marionette Master | 84.3 [77.7, 89.3] (n 150) | 82.5 [68.0, 91.3] (n 40) |

**d9** (turn 12, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 79.7 [72.5, 85.3] (n 150) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `cast:26` | Marionette Master | 74.3 [66.8, 80.7] (n 150) | 80.0 [65.2, 89.5] (n 40) |

**d10** (turn 12, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:154` | attack Beast Token | 78.0 [64.8, 87.3] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 69.0 [55.2, 80.1] (n 50) | - (n 0) |

**d11** (turn 12, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:26` | Marionette Master | 78.0 [64.8, 87.3] (n 50) | - (n 0) |
| 1 | `pass` | pass | 72.0 [58.3, 82.5] (n 50) | - (n 0) |

**d12** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:4` | Paradox Surveyor | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d13** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 99.8%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:26,154,172,185,186,187` | attack Servo Token+Beast Token+Marionette Master+Servo Token+Servo Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:26,154,172,186,187` | attack Beast Token+Marionette Master+Servo Token+Servo Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:26,172,185,186,187` | attack Servo Token+Marionette Master+Servo Token+Servo Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:154,172,185,186,187` | attack Servo Token+Beast Token+Servo Token+Servo Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:26,154,172,185,187` | attack Servo Token+Beast Token+Marionette Master+Servo Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:26,154,172,185,186` | attack Servo Token+Beast Token+Marionette Master+Servo Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:26,154,185,186,187` | attack Servo Token+Beast Token+Marionette Master+Servo Token+Servo Token | 98.0 [83.4, 99.8] (n 25) | - (n 0) |

**d14** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:1#0` | Garruk Wildspeaker: +1: Untap two target lands. | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:4` | Paradox Surveyor | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `activate:1#1` | Garruk Wildspeaker: -1: Create a 3/3 green Beast creature to | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d15** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:1#1` | Garruk Wildspeaker: -1: Create a 3/3 green Beast creature to | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:4` | Paradox Surveyor | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `activate:1#0` | Garruk Wildspeaker: +1: Untap two target lands. | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d16** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Paradox Surveyor | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d17** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:13` | March of the Multitudes | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d18** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:1#1` | Garruk Wildspeaker: -1: Create a 3/3 green Beast creature to | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:27` | Dakkon Blackblade | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:15` | Talrand, Sky Summoner | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:40` | Echo of Eons | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d19** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:27` | Dakkon Blackblade | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:15` | Talrand, Sky Summoner | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:40` | Echo of Eons | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d20** (turn 16, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:4,26,172,185,186,187,223,235,236,237,238` | attack Paradox Surveyor+Servo Token+Marionette Master+Servo Token+Servo Token+Soldier Token+Beast Token+Soldier Token+Soldier Token+Soldier Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:26,172,185,186,187,223,235,236,237,238` | attack Servo Token+Marionette Master+Servo Token+Servo Token+Soldier Token+Beast Token+Soldier Token+Soldier Token+Soldier Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:4,26,172,186,187,223,235,236,237,238` | attack Paradox Surveyor+Marionette Master+Servo Token+Servo Token+Soldier Token+Beast Token+Soldier Token+Soldier Token+Soldier Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:4,172,185,186,187,223,235,236,237,238` | attack Paradox Surveyor+Servo Token+Servo Token+Servo Token+Soldier Token+Beast Token+Soldier Token+Soldier Token+Soldier Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:4,26,172,185,187,223,235,236,237,238` | attack Paradox Surveyor+Servo Token+Marionette Master+Servo Token+Soldier Token+Beast Token+Soldier Token+Soldier Token+Soldier Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:4,26,172,185,186,223,235,236,237,238` | attack Paradox Surveyor+Servo Token+Marionette Master+Servo Token+Soldier Token+Beast Token+Soldier Token+Soldier Token+Soldier Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:4,26,172,185,186,187,223,236,237,238` | attack Paradox Surveyor+Servo Token+Marionette Master+Servo Token+Servo Token+Beast Token+Soldier Token+Soldier Token+Soldier Token+Beast Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

4135 branch games (0 with an error, left out); 63 random and 1 Forge branches ended at the turn cap.

## Checks

161415 rows checked (ids against each seat's own frame log), 8272 frame logs through tools/check-redaction.mjs, 4135 forks checked (0 not the position), 25 no-leak checks (0 moved; the negative control moved in 25). The guardrails read back from 7150 random seats' logs: a land offered at 27415 of 240132 priority decisions and taken at 27415; 0 of 0 opening hands kept; G3 left out a repeated no-op 754 time(s); G5 (D458): the engine refused 4 pick(s) it could not pay for, and 2 later offer(s) of them in the same priority window were left out; G6 (D471): 3641 pick(s) of the seats' own X plays had X drawn from 1 up, 523137 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

64 of 4135 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

