# Move atlas: pauper-2013-00001 vs pauper-2013-00002, seed 2113

D451. Seat A is pauper-2013-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 29 turns, won by B, and listed 32 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 2 | p | 3 | 2 `cast:27`, 4.5 [0.0, 9.3] (n 200) | 2 `cast:27`, 5.0 [0.0, 17.6] (n 40) | 0.87 [-1.00, 1.00] | yes |
| d2 | 4 | p | 4 | 0 `cast:3`, 0.0 [0.0, 3.0] (n 200) | 0 `cast:3`, 0.0 [0.0, 7.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d9 | 10 | a | 4 | 2 `attack:28`, 1.0 [0.0, 8.3] (n 200) | 0 `attack:27,28`, 0.0 [0.0, 15.0] (n 40) | -0.32 [-1.00, 0.83] | no |
| d11 | 12 | p | 3 | 2 `cast:26`, 6.0 [0.0, 14.8] (n 200) | 1 `cast:37`, 2.5 [0.0, 16.3] (n 40) | -0.87 [-1.00, 1.00] | no |
| d15 | 14 | a | 6 | 2 `attack:27,28,37,38`, 13.8 [6.5, 21.5] (n 200) | 2 `attack:27,28,37,38`, 12.5 [0.0, 30.0] (n 40) | 0.40 [-0.40, 1.00] | yes |
| d18 | 16 | a | 4 | 3 `attack:37`, 0.3 [0.0, 6.0] (n 200) | 3 `attack:37`, 7.5 [0.0, 20.0] (n 40) | 0.63 [-0.80, 1.00] | yes |
| d24 | 22 | a | 5 | 0 `attack:28,32,35`, 0.0 [0.0, 1.6] (n 200) | 0 `attack:28,32,35`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d25 | 24 | a | 5 | 3 `attack:28,32`, 1.3 [0.0, 7.0] (n 200) | 0 `attack:28,32,35`, 0.0 [0.0, 10.0] (n 40) | 0.87 [-0.50, 1.00] | no |
| d31 | 27 | b | 5 | 0 `block:28>50,38>50,39>53`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

9 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 1: d31 (mean value 0.0%, replaced by d25). Early stopping at 50/100/150 random branches stopped 10 option(s): d2 o2 at 50, d2 o3 at 100, d15 o1 at 50, d15 o5 at 50, d24 o1 at 50, d24 o2 at 50, d24 o3 at 50, d24 o4 at 50, d25 o1 at 50, d25 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

Over 8 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.37 [-0.18, 0.80]; at 0 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 5 of 8 decision(s) (62.5% [30.6, 86.3]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d11 (turn 12, p): rank correlation -0.87 [-1.00, 1.00]; random's best `cast:26`, Forge's best `cast:37`.
- d9 (turn 10, a): rank correlation -0.32 [-1.00, 0.83]; random's best `attack:28`, Forge's best `attack:27,28`.
- d15 (turn 14, a): rank correlation 0.40 [-0.40, 1.00]; random's best `attack:27,28,37,38`, Forge's best `attack:27,28,37,38`.
- d18 (turn 16, a): rank correlation 0.63 [-0.80, 1.00]; random's best `attack:37`, Forge's best `attack:37`.
- d25 (turn 24, a): rank correlation 0.87 [-0.50, 1.00]; random's best `attack:28,32`, Forge's best `attack:28,32,35`.

### Each decision's options, side by side

**d0** (turn 2, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 7.5 [4.6, 12.0] (n 200) | 27.5 [16.1, 42.8] (n 40) |
| 1 | `cast:28` | Unwilling Ingredient | 7.2 [4.4, 11.7] (n 200) | 27.5 [16.1, 42.8] (n 40) |
| 2 | `cast:27` | Stone-Throwing Devils | 12.0 [8.2, 17.2] (n 200) | 32.5 [20.1, 48.0] (n 40) |

**d2** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Savor | 16.3 [11.8, 22.0] (n 200) | 15.0 [7.1, 29.1] (n 40) |
| 1 | `pass` | pass | 11.5 [7.8, 16.7] (n 200) | 10.0 [4.0, 23.1] (n 40) |
| 2 | `cast:23` | Go for the Throat | 9.0 [3.7, 20.1] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:27` | Stone-Throwing Devils | 8.0 [4.1, 15.0] (n 100, stopped at 100) | - (n 0) |

**d9** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:27,28` | attack Stone-Throwing Devils+Unwilling Ingredient | 64.5 [57.6, 70.8] (n 200) | 56.3 [41.0, 70.4] (n 40) |
| 1 | `attack:none` | attack none | 61.0 [54.1, 67.5] (n 200) | 53.8 [38.7, 68.2] (n 40) |
| 2 | `attack:28` | attack Unwilling Ingredient | 65.5 [58.7, 71.7] (n 200) | 46.3 [31.8, 61.3] (n 40) |
| 3 | `attack:27` | attack Stone-Throwing Devils | 63.5 [56.6, 69.9] (n 200) | 53.8 [38.7, 68.2] (n 40) |

**d11** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 64.3 [57.4, 70.6] (n 200) | 63.7 [48.3, 76.8] (n 40) |
| 1 | `cast:37` | Three Tree Rootweaver | 63.2 [56.4, 69.6] (n 200) | 66.3 [50.8, 78.9] (n 40) |
| 2 | `cast:26` | Okiba Reckoner Raid | 70.3 [63.6, 76.2] (n 200) | 63.7 [48.3, 76.8] (n 40) |

**d15** (turn 14, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:38` | attack Syr Konrad, the Grim | 71.8 [65.1, 77.5] (n 200) | 23.8 [13.3, 38.9] (n 40) |
| 1 | `attack:none` | attack none | 63.0 [49.1, 75.0] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:27,28,37,38` | attack Syr Konrad, the Grim+Unwilling Ingredient+Stone-Throwing Devils+Three Tree Rootweaver | 85.5 [80.0, 89.7] (n 200) | 36.3 [23.2, 51.7] (n 40) |
| 3 | `attack:28,38` | attack Syr Konrad, the Grim+Unwilling Ingredient | 78.0 [71.8, 83.2] (n 200) | 21.3 [11.4, 36.1] (n 40) |
| 4 | `attack:27,38` | attack Syr Konrad, the Grim+Stone-Throwing Devils | 75.8 [69.4, 81.2] (n 200) | 26.3 [15.1, 41.5] (n 40) |
| 5 | `attack:37,38` | attack Syr Konrad, the Grim+Three Tree Rootweaver | 74.0 [60.5, 84.1] (n 50, stopped at 50) | - (n 0) |

**d18** (turn 16, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:28,37` | attack Three Tree Rootweaver+Unwilling Ingredient | 40.5 [33.9, 47.4] (n 200) | 45.0 [30.7, 60.2] (n 40) |
| 1 | `attack:none` | attack none | 35.3 [29.0, 42.1] (n 200) | 45.0 [30.7, 60.2] (n 40) |
| 2 | `attack:28` | attack Unwilling Ingredient | 40.0 [33.5, 46.9] (n 200) | 50.0 [35.2, 64.8] (n 40) |
| 3 | `attack:37` | attack Three Tree Rootweaver | 40.8 [34.2, 47.7] (n 200) | 52.5 [37.5, 67.1] (n 40) |

**d24** (turn 22, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:28,32,35` | attack Thieving Sprite+Hasran Ogress+Unwilling Ingredient | 88.0 [82.8, 91.8] (n 200) | 80.0 [65.2, 89.5] (n 40) |
| 1 | `attack:none` | attack none | 62.0 [48.1, 74.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:28,35` | attack Hasran Ogress+Unwilling Ingredient | 79.0 [65.9, 88.0] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:28,32` | attack Thieving Sprite+Unwilling Ingredient | 75.0 [61.5, 84.9] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:32,35` | attack Thieving Sprite+Hasran Ogress | 79.0 [65.9, 88.0] (n 50, stopped at 50) | - (n 0) |

**d25** (turn 24, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:28,32,35` | attack Thieving Sprite+Hasran Ogress+Unwilling Ingredient | 87.8 [82.5, 91.6] (n 200) | 90.0 [77.0, 96.0] (n 40) |
| 1 | `attack:none` | attack none | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:28,35` | attack Hasran Ogress+Unwilling Ingredient | 84.8 [79.1, 89.1] (n 200) | 80.0 [65.2, 89.5] (n 40) |
| 3 | `attack:28,32` | attack Thieving Sprite+Unwilling Ingredient | 89.0 [83.9, 92.6] (n 200) | 90.0 [77.0, 96.0] (n 40) |
| 4 | `attack:32,35` | attack Thieving Sprite+Hasran Ogress | 72.0 [58.3, 82.5] (n 50, stopped at 50) | - (n 0) |

**d31** (turn 27, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:28>50,38>50,39>53` | block Unwilling Ingredient>Generous Ent, Syr Konrad, the Grim>Generous Ent, Gravedigger>Galewind Moose | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:38>50,39>53` | block Syr Konrad, the Grim>Generous Ent, Gravedigger>Galewind Moose | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:28>50,39>53` | block Unwilling Ingredient>Generous Ent, Gravedigger>Galewind Moose | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:28>50,38>50` | block Unwilling Ingredient>Generous Ent, Syr Konrad, the Grim>Generous Ent | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

6435 branch games (0 with an error, left out); 180 random and 31 Forge branches ended at the turn cap.

## Checks

209153 rows checked (ids against each seat's own frame log), 12872 frame logs through tools/check-redaction.mjs, 6435 forks checked (0 not the position), 17 no-leak checks (0 moved; the negative control moved in 14). The guardrails read back from 10950 random seats' logs: a land offered at 39043 of 340482 priority decisions and taken at 39043; 0 of 0 opening hands kept; G3 left out a repeated no-op 8333 time(s); G5 (D458): the engine refused 844 pick(s) it could not pay for, and 795 later offer(s) of them in the same priority window were left out; G6 (D471): 802 pick(s) of the seats' own X plays had X drawn from 1 up, 5519 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

211 of 6435 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

