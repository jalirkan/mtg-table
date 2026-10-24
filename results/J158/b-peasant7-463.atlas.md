# Move atlas: peasant-900000007-A vs peasant-900000007-B, seed 463

D451. Seat A is peasant-900000007-A. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 20 turns, won by A, and listed 23 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 4 | p | 2 | 1 `cast:25`, 2.0 [0.0, 9.5] (n 200) | 0 `pass`, 0.0 [0.0, 5.0] (n 40) | -1.00 [-1.00, 1.00] | no |
| d1 | 4 | p | 2 | 1 `cast:25`, 1.5 [0.0, 8.5] (n 200) | 1 `cast:25`, 10.0 [0.0, 22.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d3 | 6 | p | 2 | 1 `cast:25`, 0.5 [0.0, 8.0] (n 200) | 1 `cast:25`, 12.5 [0.0, 30.1] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d4 | 8 | p | 5 | 3 `cast:17`, 8.5 [3.0, 16.0] (n 200) | 1 `pass`, 17.5 [5.0, 35.0] (n 40) | 0.40 [-0.56, 0.90] | no |
| d6 | 12 | p | 7 | 1 `cast:25`, 7.5 [2.0, 16.5] (n 200) | 6 `cast:26`, 2.5 [0.0, 12.5] (n 40) | -0.48 [-0.79, 0.32] | no |
| d7 | 12 | p | 7 | 0 `cast:39`, 0.0 [0.0, 6.5] (n 200) | 0 `cast:39`, 0.0 [0.0, 0.0] (n 40) | 0.29 [-0.31, 0.67] | yes |
| d9 | 14 | p | 6 | 4 `cast:17`, 2.0 [0.0, 10.5] (n 200) | 0 `activate:26`, 0.0 [0.0, 0.0] (n 40) | 0.37 [-0.39, 0.71] | no |
| d10 | 14 | p | 4 | 0 `pass`, 0.0 [0.0, 4.0] (n 200) | 3 `cast:24`, 2.5 [0.0, 10.0] (n 40) | -0.54 [-0.93, 0.77] | no |
| d12 | 14 | p | 4 | 2 `cast:25`, 0.5 [0.0, 8.5] (n 200) | 3 `cast:24`, 2.5 [0.0, 7.5] (n 40) | 0.00 [-0.82, 0.82] | no |
| d13 | 16 | p | 5 | 0 `cast:7`, 0.0 [0.0, 0.0] (n 200) | 0 `cast:7`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d15 | 16 | a | 2 | 0 `attack:39`, 0.0 [0.0, 0.0] (n 200) | 0 `attack:39`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d16 | 16 | p | 4 | 3 `cast:24`, 4.0 [0.0, 11.0] (n 200) | 0 `cast:17`, 0.0 [0.0, 0.0] (n 40) | 0.77 [0.26, 0.82] | no |
| d18 | 18 | p | 4 | 3 `cast:8`, 3.5 [0.0, 8.0] (n 200) | 0 `pass`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d19 | 18 | a | 7 | 2 `attack:17,39,71,158`, 1.0 [0.0, 3.0] (n 200) | 0 `attack:39,71`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d21 | 20 | p | 3 | 1 `cast:25`, 0.5 [0.0, 2.0] (n 200) | 0 `pass`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d22 | 20 | a | 8 | 0 `attack:8,17,39,71,158,164,165`, 0.0 [0.0, 0.0] (n 200) | 0 `attack:8,17,39,71,158,164,165`, 0.0 [0.0, 0.0] (n 40) | - | yes |

### What the two maps agree and disagree about

Over 16 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.18 [-0.23, 0.58]; at 1 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 6 of 16 decision(s) (37.5% [18.5, 61.4]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d0 (turn 4, p): rank correlation -1.00 [-1.00, 1.00]; random's best `cast:25`, Forge's best `pass`.
- d10 (turn 14, p): rank correlation -0.54 [-0.93, 0.77]; random's best `pass`, Forge's best `cast:24`.
- d6 (turn 12, p): rank correlation -0.48 [-0.79, 0.32]; random's best `cast:25`, Forge's best `cast:26`.
- d12 (turn 14, p): rank correlation 0.00 [-0.82, 0.82]; random's best `cast:25`, Forge's best `cast:24`.
- d7 (turn 12, p): rank correlation 0.29 [-0.31, 0.67]; random's best `cast:39`, Forge's best `cast:39`.

### Each decision's options, side by side

**d0** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 57.5 [50.6, 64.1] (n 200) | 40.0 [26.4, 55.4] (n 40) |
| 1 | `cast:25` | Chart a Course | 59.5 [52.6, 66.1] (n 200) | 35.0 [22.1, 50.5] (n 40) |

**d1** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 63.5 [56.6, 69.9] (n 200) | 27.5 [16.1, 42.8] (n 40) |
| 1 | `cast:25` | Chart a Course | 65.0 [58.2, 71.3] (n 200) | 37.5 [24.2, 53.0] (n 40) |

**d3** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 56.0 [49.1, 62.7] (n 200) | 32.5 [20.1, 48.0] (n 40) |
| 1 | `cast:25` | Chart a Course | 56.5 [49.6, 63.2] (n 200) | 45.0 [30.7, 60.2] (n 40) |

**d4** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Animate Dead | 62.5 [55.6, 68.9] (n 200) | 37.5 [24.2, 53.0] (n 40) |
| 1 | `pass` | pass | 63.0 [56.1, 69.4] (n 200) | 55.0 [39.8, 69.3] (n 40) |
| 2 | `cast:25` | Chart a Course | 68.0 [61.3, 74.1] (n 200) | 47.5 [32.9, 62.5] (n 40) |
| 3 | `cast:17` | Marionette Apprentice | 71.0 [64.4, 76.8] (n 200) | 52.5 [37.5, 67.1] (n 40) |
| 4 | `cast:24` | Stock Up | 66.5 [59.7, 72.7] (n 200) | 42.5 [28.5, 57.8] (n 40) |

**d6** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 45.5 [38.8, 52.4] (n 200) | 70.0 [54.6, 81.9] (n 40) |
| 1 | `cast:25` | Chart a Course | 53.0 [46.1, 59.8] (n 200) | 45.0 [30.7, 60.2] (n 40) |
| 2 | `cast:37` | Khenra Spellspear | 48.5 [41.7, 55.4] (n 200) | 60.0 [44.6, 73.7] (n 40) |
| 3 | `cast:17` | Marionette Apprentice | 49.0 [42.2, 55.9] (n 200) | 60.0 [44.6, 73.7] (n 40) |
| 4 | `cast:24` | Stock Up | 47.0 [40.2, 53.9] (n 200) | 52.5 [37.5, 67.1] (n 40) |
| 5 | `cast:39` | Marauding Sphinx | 53.0 [46.1, 59.8] (n 200) | 67.5 [52.0, 79.9] (n 40) |
| 6 | `cast:26` | Bonesplitter | 47.0 [40.2, 53.9] (n 200) | 72.5 [57.2, 83.9] (n 40) |

**d7** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:39` | Marauding Sphinx | 59.0 [52.1, 65.6] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 45.5 [38.8, 52.4] (n 200) | 55.0 [39.8, 69.3] (n 40) |
| 2 | `cast:25` | Chart a Course | 51.5 [44.6, 58.3] (n 200) | 65.0 [49.5, 77.9] (n 40) |
| 3 | `cast:37` | Khenra Spellspear | 56.0 [49.1, 62.7] (n 200) | 60.0 [44.6, 73.7] (n 40) |
| 4 | `cast:17` | Marionette Apprentice | 52.5 [45.6, 59.3] (n 200) | 60.0 [44.6, 73.7] (n 40) |
| 5 | `cast:24` | Stock Up | 53.5 [46.6, 60.3] (n 200) | 55.0 [39.8, 69.3] (n 40) |
| 6 | `cast:26` | Bonesplitter | 48.5 [41.7, 55.4] (n 200) | 85.0 [70.9, 92.9] (n 40) |

**d9** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:26` | Bonesplitter: Equip {1} ({1}: Attach to target creature you  | 76.0 [69.6, 81.4] (n 200) | 95.0 [83.5, 98.6] (n 40) |
| 1 | `pass` | pass | 69.5 [62.8, 75.5] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 2 | `cast:25` | Chart a Course | 70.5 [63.8, 76.4] (n 200) | 90.0 [77.0, 96.0] (n 40) |
| 3 | `cast:37` | Khenra Spellspear | 74.5 [68.0, 80.0] (n 200) | 95.0 [83.5, 98.6] (n 40) |
| 4 | `cast:17` | Marionette Apprentice | 78.0 [71.8, 83.2] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 5 | `cast:24` | Stock Up | 72.0 [65.4, 77.8] (n 200) | 95.0 [83.5, 98.6] (n 40) |

**d10** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 77.0 [70.7, 82.3] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 1 | `cast:25` | Chart a Course | 73.0 [66.5, 78.7] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 2 | `cast:37` | Khenra Spellspear | 69.0 [62.3, 75.0] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 3 | `cast:24` | Stock Up | 69.0 [62.3, 75.0] (n 200) | 95.0 [83.5, 98.6] (n 40) |

**d12** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Khenra Spellspear | 80.0 [73.9, 85.0] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 1 | `pass` | pass | 77.0 [70.7, 82.3] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 2 | `cast:25` | Chart a Course | 80.5 [74.5, 85.4] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 3 | `cast:24` | Stock Up | 80.0 [73.9, 85.0] (n 200) | 95.0 [83.5, 98.6] (n 40) |

**d13** (turn 16, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:7` | Reanimate | 90.5 [85.6, 93.8] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `pass` | pass | 72.0 [65.4, 77.8] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `cast:25` | Chart a Course | 70.5 [63.8, 76.4] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `cast:17` | Marionette Apprentice | 77.5 [71.2, 82.7] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 4 | `cast:24` | Stock Up | 76.0 [69.6, 81.4] (n 200) | 100.0 [91.2, 100.0] (n 40) |

**d15** (turn 16, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:39` | attack Marauding Sphinx | 86.0 [80.5, 90.1] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `attack:none` | attack none | 72.5 [65.9, 78.2] (n 200) | 100.0 [91.2, 100.0] (n 40) |

**d16** (turn 16, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Marionette Apprentice | 83.5 [77.7, 88.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `pass` | pass | 78.0 [71.8, 83.2] (n 200) | 97.5 [87.1, 99.6] (n 40) |
| 2 | `cast:25` | Chart a Course | 86.0 [80.5, 90.1] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `cast:24` | Stock Up | 87.5 [82.2, 91.4] (n 200) | 100.0 [91.2, 100.0] (n 40) |

**d18** (turn 18, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 92.5 [88.0, 95.4] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `cast:25` | Chart a Course | 91.0 [86.2, 94.2] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `cast:36` | Morbid Opportunist | 84.0 [78.3, 88.4] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `cast:8` | Whirler Rogue | 96.0 [92.3, 98.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |

**d19** (turn 18, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:39,71` | attack Primordial Pachyderm+Marauding Sphinx | 98.5 [95.7, 99.5] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `attack:none` | attack none | 83.0 [77.2, 87.6] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `attack:17,39,71,158` | attack Primordial Pachyderm+Marauding Sphinx+Marionette Apprentice+Servo Token | 99.5 [97.2, 99.9] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `attack:39` | attack Marauding Sphinx | 92.0 [87.4, 95.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 4 | `attack:71` | attack Primordial Pachyderm | 90.0 [85.1, 93.4] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 5 | `attack:17,39,71` | attack Primordial Pachyderm+Marauding Sphinx+Marionette Apprentice | 98.5 [95.7, 99.5] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 6 | `attack:39,71,158` | attack Primordial Pachyderm+Marauding Sphinx+Servo Token | 99.5 [97.2, 99.9] (n 200) | 100.0 [91.2, 100.0] (n 40) |

**d21** (turn 20, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 99.0 [96.4, 99.7] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `cast:25` | Chart a Course | 99.5 [97.2, 99.9] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `cast:36` | Morbid Opportunist | 99.0 [96.4, 99.7] (n 200) | 100.0 [91.2, 100.0] (n 40) |

**d22** (turn 20, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:8,17,39,71,158,164,165` | attack Marionette Apprentice+Thopter Token+Thopter Token+Marauding Sphinx+Primordial Pachyderm+Whirler Rogue+Servo Token | 100.0 [98.1, 100.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `attack:none` | attack none | 95.5 [91.7, 97.6] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `attack:8,39,71,158,164,165` | attack Thopter Token+Thopter Token+Marauding Sphinx+Primordial Pachyderm+Whirler Rogue+Servo Token | 100.0 [98.1, 100.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `attack:8,17,39,71,158,165` | attack Marionette Apprentice+Thopter Token+Marauding Sphinx+Primordial Pachyderm+Whirler Rogue+Servo Token | 100.0 [98.1, 100.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 4 | `attack:8,17,39,71,158,164` | attack Marionette Apprentice+Thopter Token+Marauding Sphinx+Primordial Pachyderm+Whirler Rogue+Servo Token | 100.0 [98.1, 100.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 5 | `attack:8,17,71,158,164,165` | attack Marionette Apprentice+Thopter Token+Thopter Token+Primordial Pachyderm+Whirler Rogue+Servo Token | 100.0 [98.1, 100.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 6 | `attack:8,17,39,158,164,165` | attack Marionette Apprentice+Thopter Token+Thopter Token+Marauding Sphinx+Whirler Rogue+Servo Token | 100.0 [98.1, 100.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 7 | `attack:17,39,71,158,164,165` | attack Marionette Apprentice+Thopter Token+Thopter Token+Marauding Sphinx+Primordial Pachyderm+Servo Token | 100.0 [98.1, 100.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |

17280 branch games (0 with an error, left out); 2 random and 0 Forge branches ended at the turn cap.

## Checks

490588 rows checked (ids against each seat's own frame log), 34562 frame logs through tools/check-redaction.mjs, 17280 forks checked (0 not the position), 32 no-leak checks (0 moved; the negative control moved in 32). The guardrails read back from 28800 random seats' logs: a land offered at 75191 of 827244 priority decisions and taken at 75191; 0 of 0 opening hands kept; G3 left out a repeated no-op 0 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0). No problem.

