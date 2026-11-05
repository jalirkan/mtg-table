# Move atlas: pauper-2829-00001 vs pauper-2829-00002, seed 2929

D451. Seat A is pauper-2829-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 18 turns, won by A, and listed 24 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 2 | p | 3 | 0 `activate:15#0`, 0.0 [0.0, 18.0] (n 50) | -, - (n 0) | - | - |
| d1 | 4 | p | 3 | 1 `pass`, 6.3 [0.0, 13.7] (n 150) | 1 `pass`, 2.5 [0.0, 10.0] (n 40) | 0.50 [-0.87, 1.00] | yes |
| d5 | 6 | p | 3 | 1 `pass`, 3.3 [0.0, 11.3] (n 150) | 0 `cast:21`, 0.0 [0.0, 5.0] (n 40) | -1.00 [-1.00, 1.00] | no |
| d6 | 8 | p | 4 | 1 `pass`, 4.3 [0.0, 13.3] (n 150) | 3 `cast:40`, 5.0 [0.0, 12.5] (n 40) | -0.80 [-1.00, 0.77] | no |
| d11 | 10 | a | 5 | 2 `attack:40,87`, 1.7 [0.0, 7.3] (n 150) | 0 `attack:21,40,87`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d12 | 10 | p | 4 | 1 `pass`, 7.3 [1.0, 15.0] (n 150) | 1 `pass`, 12.5 [2.5, 22.5] (n 40) | 0.95 [-0.26, 0.95] | yes |
| d13 | 12 | p | 3 | 0 `pass`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d14 | 12 | a | 4 | 3 `attack:87`, 0.3 [0.0, 5.3] (n 150) | 0 `attack:40,87`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d15 | 12 | p | 3 | 0 `cast:22`, 0.0 [0.0, 3.0] (n 50) | -, - (n 0) | - | - |
| d17 | 14 | a | 4 | 0 `attack:22,87`, 0.0 [0.0, 3.0] (n 50) | -, - (n 0) | - | - |
| d20 | 16 | a | 5 | 0 `attack:22,34,87`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d23 | 18 | a | 6 | 0 `attack:8,22,34,87`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

12 decision(s) branched, 6 of them in full (4 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 2: d20 (mean value 100.0%, replaced by d13), d23 (mean value 100.0%, replaced by d17). Early stopping at 50/100 random branches stopped 0 option(s): none (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 4 (d0, d15, d17, d13), each a partial label at that n, never confident, saving at most 1820 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

Over 6 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is -0.09 [-0.90, 0.72]; at 0 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 2 of 6 decision(s) (33.3% [9.7, 70.0]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d5 (turn 6, p): rank correlation -1.00 [-1.00, 1.00]; random's best `pass`, Forge's best `cast:21`.
- d6 (turn 8, p): rank correlation -0.80 [-1.00, 0.77]; random's best `pass`, Forge's best `cast:40`.
- d1 (turn 4, p): rank correlation 0.50 [-0.87, 1.00]; random's best `pass`, Forge's best `pass`.
- d12 (turn 10, p): rank correlation 0.95 [-0.26, 0.95]; random's best `pass`, Forge's best `pass`.
- d11 (turn 10, a): rank correlation -; random's best `attack:40,87`, Forge's best `attack:21,40,87`.

### Each decision's options, side by side

**d0** (turn 2, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:15#0` | Foreboding Landscape: {T}, Sacrifice CARDNAME: Search your l | 79.0 [65.9, 88.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 62.0 [48.1, 74.1] (n 50) | - (n 0) |
| 2 | `cast:24` | Candy Trail | 78.0 [64.8, 87.3] (n 50) | - (n 0) |

**d1** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:33#0` | Bountiful Landscape: {T}, Sacrifice CARDNAME: Search your li | 74.7 [67.2, 81.0] (n 150) | 95.0 [83.5, 98.6] (n 40) |
| 1 | `pass` | pass | 81.0 [74.0, 86.5] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 2 | `cast:24` | Candy Trail | 75.7 [68.2, 81.8] (n 150) | 85.0 [70.9, 92.9] (n 40) |

**d5** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Elvish Visionary | 77.3 [70.0, 83.3] (n 150) | 92.5 [80.1, 97.4] (n 40) |
| 1 | `pass` | pass | 80.7 [73.6, 86.2] (n 150) | 87.5 [73.9, 94.5] (n 40) |
| 2 | `cast:40` | Mechanized Ninja Cavalry | 79.3 [72.2, 85.0] (n 150) | 90.0 [77.0, 96.0] (n 40) |

**d6** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:6#0` | Sheltering Landscape: {T}, Sacrifice CARDNAME: Search your l | 78.0 [70.7, 83.9] (n 150) | 95.0 [83.5, 98.6] (n 40) |
| 1 | `pass` | pass | 82.3 [75.4, 87.6] (n 150) | 92.5 [80.1, 97.4] (n 40) |
| 2 | `cast:22` | Bog Wraith | 79.7 [72.5, 85.3] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 3 | `cast:40` | Mechanized Ninja Cavalry | 77.3 [70.0, 83.3] (n 150) | 100.0 [91.2, 100.0] (n 40) |

**d11** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:21,40,87` | attack Elvish Visionary+Robot Token+Mechanized Ninja Cavalry | 83.0 [76.2, 88.2] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `attack:none` | attack none | 80.3 [73.3, 85.9] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `attack:40,87` | attack Robot Token+Mechanized Ninja Cavalry | 84.7 [78.0, 89.6] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `attack:21,40` | attack Elvish Visionary+Mechanized Ninja Cavalry | 84.3 [77.7, 89.3] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 4 | `attack:21,87` | attack Elvish Visionary+Robot Token | 83.3 [76.5, 88.4] (n 150) | 100.0 [91.2, 100.0] (n 40) |

**d12** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:19` | Phantom Monster | 79.7 [72.5, 85.3] (n 150) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 87.0 [80.7, 91.5] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `cast:22` | Bog Wraith | 82.3 [75.4, 87.6] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 3 | `cast:16` | Opt | 83.3 [76.5, 88.4] (n 150) | 97.5 [87.1, 99.6] (n 40) |

**d13** (turn 12, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 92.0 [81.2, 96.9] (n 50) | - (n 0) |
| 1 | `cast:22` | Bog Wraith | 89.0 [77.4, 95.0] (n 50) | - (n 0) |
| 2 | `cast:34` | Cloudkin Seer | 90.0 [78.6, 95.7] (n 50) | - (n 0) |

**d14** (turn 12, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:40,87` | attack Robot Token+Mechanized Ninja Cavalry | 87.3 [81.1, 91.7] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `attack:none` | attack none | 87.3 [81.1, 91.7] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `attack:40` | attack Mechanized Ninja Cavalry | 84.3 [77.7, 89.3] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `attack:87` | attack Robot Token | 87.7 [81.5, 92.0] (n 150) | 100.0 [91.2, 100.0] (n 40) |

**d15** (turn 12, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:22` | Bog Wraith | 95.0 [85.1, 98.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 87.0 [75.0, 93.7] (n 50) | - (n 0) |
| 2 | `cast:34` | Cloudkin Seer | 89.0 [77.4, 95.0] (n 50) | - (n 0) |

**d17** (turn 14, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:22,87` | attack Bog Wraith+Robot Token | 95.0 [85.1, 98.4] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 90.0 [78.6, 95.7] (n 50) | - (n 0) |
| 2 | `attack:87` | attack Robot Token | 91.0 [79.9, 96.3] (n 50) | - (n 0) |
| 3 | `attack:22` | attack Bog Wraith | 92.0 [81.2, 96.9] (n 50) | - (n 0) |

**d20** (turn 16, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:22,34,87` | attack Cloudkin Seer+Bog Wraith+Robot Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:22,87` | attack Bog Wraith+Robot Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:34,87` | attack Cloudkin Seer+Robot Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:22,34` | attack Cloudkin Seer+Bog Wraith | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d23** (turn 18, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:8,22,34,87` | attack Cloudkin Seer+Bog Wraith+Robot Token+Clockwork Beast | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:8,22,87` | attack Bog Wraith+Robot Token+Clockwork Beast | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:8,34,87` | attack Cloudkin Seer+Robot Token+Clockwork Beast | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:8,22,34` | attack Cloudkin Seer+Bog Wraith+Clockwork Beast | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:22,34,87` | attack Cloudkin Seer+Bog Wraith+Robot Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

5295 branch games (0 with an error, left out); 117 random and 0 Forge branches ended at the turn cap.

## Checks

214428 rows checked (ids against each seat's own frame log), 10592 frame logs through tools/check-redaction.mjs, 5295 forks checked (0 not the position), 18 no-leak checks (0 moved; the negative control moved in 18). The guardrails read back from 8750 random seats' logs: a land offered at 40469 of 511368 priority decisions and taken at 40469; 0 of 0 opening hands kept; G3 left out a repeated no-op 421 time(s); G5 (D458): the engine refused 21 pick(s) it could not pay for, and 3 later offer(s) of them in the same priority window were left out; G6 (D471): 1658 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

117 of 5295 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

