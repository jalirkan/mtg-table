# Move atlas: pauper-2013-00001 vs pauper-2013-00002, seed 2113

D451. Seat A is pauper-2013-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 29 turns, won by B, and listed 32 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 2 | p | 3 | 0 `pass`, 0.0 [0.0, 6.3] (n 200) | 2 `cast:27`, 5.0 [0.0, 17.6] (n 40) | -0.87 [-1.00, 1.00] | no |
| d2 | 4 | p | 4 | 1 `pass`, 0.5 [0.0, 7.8] (n 200) | 0 `cast:3`, 0.0 [0.0, 10.1] (n 40) | 0.32 [-0.80, 1.00] | no |
| d9 | 10 | a | 4 | 2 `attack:28`, 3.3 [0.0, 10.3] (n 200) | 0 `attack:27,28`, 0.0 [0.0, 6.3] (n 40) | -1.00 [-1.00, 1.00] | no |
| d11 | 12 | p | 3 | 0 `pass`, 0.0 [0.0, 9.0] (n 200) | 1 `cast:37`, 2.5 [0.0, 16.3] (n 40) | -0.87 [-1.00, 1.00] | no |
| d15 | 14 | a | 6 | 2 `attack:27,28,37,38`, 14.2 [7.5, 21.8] (n 200) | 2 `attack:27,28,37,38`, 12.5 [0.0, 30.0] (n 40) | 0.80 [-0.40, 1.00] | yes |
| d18 | 16 | a | 4 | 0 `attack:28,37`, 0.0 [0.0, 1.5] (n 200) | 3 `attack:37`, 7.5 [0.0, 20.0] (n 40) | -0.11 [-1.00, 0.83] | no |
| d24 | 22 | a | 5 | 0 `attack:28,32,35`, 0.0 [0.0, 0.0] (n 200) | 0 `attack:28,32,35`, 0.0 [0.0, 0.0] (n 40) | 1.00 [1.00, 1.00] | yes |
| d25 | 24 | a | 5 | 3 `attack:28,32`, 1.3 [0.0, 4.5] (n 200) | 0 `attack:28,32,35`, 0.0 [0.0, 10.0] (n 40) | 0.87 [0.50, 1.00] | no |
| d31 | 27 | b | 5 | 0 `block:28>50,38>50,39>53`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

9 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 1: d31 (mean value 0.0%, replaced by d25). Early stopping at 50/100/150 random branches stopped 9 option(s): d9 o1 at 150, d9 o3 at 100, d15 o1 at 100, d15 o5 at 50, d24 o1 at 50, d24 o2 at 150, d24 o3 at 100, d25 o1 at 50, d25 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

Over 8 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.02 [-0.55, 0.54]; at 2 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 2 of 8 decision(s) (25.0% [7.1, 59.1]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d9 (turn 10, a): rank correlation -1.00 [-1.00, 1.00]; random's best `attack:28`, Forge's best `attack:27,28`.
- d0 (turn 2, p): rank correlation -0.87 [-1.00, 1.00]; random's best `pass`, Forge's best `cast:27`.
- d11 (turn 12, p): rank correlation -0.87 [-1.00, 1.00]; random's best `pass`, Forge's best `cast:37`.
- d18 (turn 16, a): rank correlation -0.11 [-1.00, 0.83]; random's best `attack:28,37`, Forge's best `attack:37`.
- d2 (turn 4, p): rank correlation 0.32 [-0.80, 1.00]; random's best `pass`, Forge's best `cast:3`.

### Each decision's options, side by side

**d0** (turn 2, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 28.0 [22.2, 34.6] (n 200) | 27.5 [16.1, 42.8] (n 40) |
| 1 | `cast:28` | Unwilling Ingredient | 27.8 [22.0, 34.3] (n 200) | 27.5 [16.1, 42.8] (n 40) |
| 2 | `cast:27` | Stone-Throwing Devils | 24.8 [19.3, 31.2] (n 200) | 32.5 [20.1, 48.0] (n 40) |

**d2** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Savor | 25.3 [19.7, 31.7] (n 200) | 15.0 [7.1, 29.1] (n 40) |
| 1 | `pass` | pass | 25.8 [20.2, 32.2] (n 200) | 10.0 [4.0, 23.1] (n 40) |
| 2 | `cast:23` | Go for the Throat | 23.3 [17.9, 29.6] (n 200) | 5.0 [1.4, 16.5] (n 40) |
| 3 | `cast:27` | Stone-Throwing Devils | 25.3 [19.7, 31.7] (n 200) | 12.5 [5.5, 26.1] (n 40) |

**d9** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:27,28` | attack Stone-Throwing Devils+Unwilling Ingredient | 69.3 [62.5, 75.2] (n 200) | 56.3 [41.0, 70.4] (n 40) |
| 1 | `attack:none` | attack none | 65.3 [57.4, 72.5] (n 150, stopped at 150) | - (n 0) |
| 2 | `attack:28` | attack Unwilling Ingredient | 72.5 [65.9, 78.2] (n 200) | 46.3 [31.8, 61.3] (n 40) |
| 3 | `attack:27` | attack Stone-Throwing Devils | 64.0 [54.2, 72.7] (n 100, stopped at 100) | - (n 0) |

**d11** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 67.5 [60.7, 73.6] (n 200) | 63.7 [48.3, 76.8] (n 40) |
| 1 | `cast:37` | Three Tree Rootweaver | 61.0 [54.1, 67.5] (n 200) | 66.3 [50.8, 78.9] (n 40) |
| 2 | `cast:26` | Okiba Reckoner Raid | 67.3 [60.5, 73.4] (n 200) | 63.7 [48.3, 76.8] (n 40) |

**d15** (turn 14, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:38` | attack Syr Konrad, the Grim | 68.0 [61.3, 74.1] (n 200) | 23.8 [13.3, 38.9] (n 40) |
| 1 | `attack:none` | attack none | 65.0 [55.3, 73.6] (n 100, stopped at 100) | - (n 0) |
| 2 | `attack:27,28,37,38` | attack Syr Konrad, the Grim+Unwilling Ingredient+Stone-Throwing Devils+Three Tree Rootweaver | 82.3 [76.4, 86.9] (n 200) | 36.3 [23.2, 51.7] (n 40) |
| 3 | `attack:28,38` | attack Syr Konrad, the Grim+Unwilling Ingredient | 77.3 [71.0, 82.5] (n 200) | 21.3 [11.4, 36.1] (n 40) |
| 4 | `attack:27,38` | attack Syr Konrad, the Grim+Stone-Throwing Devils | 77.8 [71.5, 83.0] (n 200) | 26.3 [15.1, 41.5] (n 40) |
| 5 | `attack:37,38` | attack Syr Konrad, the Grim+Three Tree Rootweaver | 71.0 [57.3, 81.7] (n 50, stopped at 50) | - (n 0) |

**d18** (turn 16, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:28,37` | attack Three Tree Rootweaver+Unwilling Ingredient | 39.5 [33.0, 46.4] (n 200) | 45.0 [30.7, 60.2] (n 40) |
| 1 | `attack:none` | attack none | 34.0 [27.8, 40.8] (n 200) | 45.0 [30.7, 60.2] (n 40) |
| 2 | `attack:28` | attack Unwilling Ingredient | 35.0 [28.7, 41.8] (n 200) | 50.0 [35.2, 64.8] (n 40) |
| 3 | `attack:37` | attack Three Tree Rootweaver | 34.8 [28.5, 41.6] (n 200) | 52.5 [37.5, 67.1] (n 40) |

**d24** (turn 22, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:28,32,35` | attack Thieving Sprite+Hasran Ogress+Unwilling Ingredient | 95.5 [91.7, 97.6] (n 200) | 80.0 [65.2, 89.5] (n 40) |
| 1 | `attack:none` | attack none | 61.0 [47.2, 73.3] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:28,35` | attack Hasran Ogress+Unwilling Ingredient | 90.7 [84.9, 94.4] (n 150, stopped at 150) | - (n 0) |
| 3 | `attack:28,32` | attack Thieving Sprite+Unwilling Ingredient | 82.5 [73.9, 88.7] (n 100, stopped at 100) | - (n 0) |
| 4 | `attack:32,35` | attack Thieving Sprite+Hasran Ogress | 91.3 [86.5, 94.4] (n 200) | 63.7 [48.3, 76.8] (n 40) |

**d25** (turn 24, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:28,32,35` | attack Thieving Sprite+Hasran Ogress+Unwilling Ingredient | 96.0 [92.3, 98.0] (n 200) | 90.0 [77.0, 96.0] (n 40) |
| 1 | `attack:none` | attack none | 84.0 [71.5, 91.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:28,35` | attack Hasran Ogress+Unwilling Ingredient | 92.8 [88.3, 95.6] (n 200) | 80.0 [65.2, 89.5] (n 40) |
| 3 | `attack:28,32` | attack Thieving Sprite+Unwilling Ingredient | 97.3 [93.9, 98.8] (n 200) | 90.0 [77.0, 96.0] (n 40) |
| 4 | `attack:32,35` | attack Thieving Sprite+Hasran Ogress | 83.0 [70.3, 91.0] (n 50, stopped at 50) | - (n 0) |

**d31** (turn 27, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:28>50,38>50,39>53` | block Unwilling Ingredient>Generous Ent, Syr Konrad, the Grim>Generous Ent, Gravedigger>Galewind Moose | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:38>50,39>53` | block Syr Konrad, the Grim>Generous Ent, Gravedigger>Galewind Moose | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:28>50,39>53` | block Unwilling Ingredient>Generous Ent, Gravedigger>Galewind Moose | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:28>50,38>50` | block Unwilling Ingredient>Generous Ent, Syr Konrad, the Grim>Generous Ent | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

6925 branch games (0 with an error, left out); 175 random and 30 Forge branches ended at the turn cap.

## Checks

231424 rows checked (ids against each seat's own frame log), 13852 frame logs through tools/check-redaction.mjs, 6925 forks checked (0 not the position), 17 no-leak checks (0 moved; the negative control moved in 14). The guardrails read back from 11850 random seats' logs: a land offered at 42820 of 652487 priority decisions and taken at 42820; 0 of 0 opening hands kept; G3 left out a repeated no-op 5307 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 20859 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

205 of 6925 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

