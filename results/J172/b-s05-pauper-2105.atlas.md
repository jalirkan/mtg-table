# Move atlas: pauper-2005-00001 vs pauper-2005-00002, seed 2105

D451. Seat A is pauper-2005-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 14 turns, won by A, and listed 12 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 6 | p | 3 | 1 `cast:1`, 6.3 [1.5, 14.0] (n 200) | -, - (n 0) | - | - |
| d1 | 6 | p | 3 | 2 `cast:1`, 0.5 [0.0, 8.5] (n 200) | -, - (n 0) | - | - |
| d2 | 8 | p | 6 | 5 `cast:6`, 2.8 [0.0, 10.8] (n 200) | -, - (n 0) | - | - |
| d3 | 8 | p | 6 | 2 `cast:8`, 0.8 [0.0, 8.3] (n 200) | -, - (n 0) | - | - |
| d4 | 10 | p | 6 | 0 `cast:6`, 0.0 [0.0, 2.0] (n 200) | -, - (n 0) | - | - |
| d6 | 12 | p | 5 | 2 `cast:8`, 6.3 [2.0, 11.0] (n 200) | -, - (n 0) | - | - |
| d7 | 12 | p | 4 | 1 `cast:8`, 1.5 [0.0, 6.8] (n 200) | -, - (n 0) | - | - |
| d8 | 12 | a | 4 | 0 `attack:6,39`, 0.0 [0.0, 2.3] (n 200) | -, - (n 0) | - | - |
| d9 | 12 | p | 4 | 2 `cast:40`, 2.0 [0.0, 6.0] (n 25) | -, - (n 0) | - | - |
| d10 | 14 | p | 4 | 3 `cast:3`, 2.0 [0.0, 6.0] (n 25) | -, - (n 0) | - | - |
| d11 | 14 | a | 5 | 1 `attack:none`, 2.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 3: d10 (mean value 96.0%, replaced by d9), d11 (mean value 97.2%, replaced by d2), d9 (mean value 96.5%, replaced by d6). Early stopping at 50/100/150 random branches stopped 11 option(s): d3 o1 at 50, d3 o3 at 50, d4 o2 at 100, d4 o4 at 100, d4 o5 at 150, d7 o2 at 100, d6 o1 at 50, d6 o3 at 50, d6 o4 at 50, d2 o2 at 50, d2 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 69.5 [62.8, 75.5] (n 200) | - (n 0) |
| 1 | `cast:1` | Suplex | 75.8 [69.4, 81.2] (n 200) | - (n 0) |
| 2 | `cast:10` | Potioner's Trove | 75.3 [68.8, 80.7] (n 200) | - (n 0) |

**d1** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:10` | Potioner's Trove | 70.8 [64.1, 76.6] (n 200) | - (n 0) |
| 1 | `pass` | pass | 68.3 [61.5, 74.3] (n 200) | - (n 0) |
| 2 | `cast:1` | Suplex | 71.3 [64.6, 77.1] (n 200) | - (n 0) |

**d2** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 78.5 [72.3, 83.6] (n 200) | - (n 0) |
| 1 | `cast:39` | Sunastian Falconer | 80.8 [74.7, 85.6] (n 200) | - (n 0) |
| 2 | `cast:8` | Primordial Pachyderm | 72.0 [58.3, 82.5] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:40` | Lifeforce | 78.0 [71.8, 83.2] (n 200) | - (n 0) |
| 4 | `cast:1` | Suplex | 73.0 [59.4, 83.3] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:6` | Acidic Slime | 81.3 [75.3, 86.1] (n 200) | - (n 0) |

**d3** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:39` | Sunastian Falconer | 77.8 [71.5, 83.0] (n 200) | - (n 0) |
| 1 | `pass` | pass | 65.0 [51.1, 76.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:8` | Primordial Pachyderm | 78.5 [72.3, 83.6] (n 200) | - (n 0) |
| 3 | `cast:40` | Lifeforce | 68.0 [54.2, 79.2] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:1` | Suplex | 77.0 [70.7, 82.3] (n 200) | - (n 0) |
| 5 | `cast:6` | Acidic Slime | 77.3 [71.0, 82.5] (n 200) | - (n 0) |

**d4** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Acidic Slime | 91.0 [86.2, 94.2] (n 200) | - (n 0) |
| 1 | `pass` | pass | 84.5 [78.8, 88.9] (n 200) | - (n 0) |
| 2 | `cast:1` | Suplex | 83.5 [75.0, 89.5] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:8` | Primordial Pachyderm | 85.3 [79.7, 89.5] (n 200) | - (n 0) |
| 4 | `cast:40` | Lifeforce | 83.5 [75.0, 89.5] (n 100, stopped at 100) | - (n 0) |
| 5 | `cast:38` | Voldaren Epicure | 85.0 [78.4, 89.8] (n 150, stopped at 150) | - (n 0) |

**d6** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Suplex | 89.3 [84.2, 92.8] (n 200) | - (n 0) |
| 1 | `pass` | pass | 89.0 [77.4, 95.0] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:8` | Primordial Pachyderm | 95.5 [91.7, 97.6] (n 200) | - (n 0) |
| 3 | `cast:40` | Lifeforce | 90.0 [78.6, 95.7] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:38` | Voldaren Epicure | 84.0 [71.5, 91.7] (n 50, stopped at 50) | - (n 0) |

**d7** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 91.3 [86.5, 94.4] (n 200) | - (n 0) |
| 1 | `cast:8` | Primordial Pachyderm | 92.8 [88.3, 95.6] (n 200) | - (n 0) |
| 2 | `cast:40` | Lifeforce | 85.5 [77.3, 91.1] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:38` | Voldaren Epicure | 90.0 [85.1, 93.4] (n 200) | - (n 0) |

**d8** (turn 12, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:6,39` | attack Acidic Slime+Sunastian Falconer | 93.3 [88.9, 96.0] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 88.0 [82.8, 91.8] (n 200) | - (n 0) |
| 2 | `attack:39` | attack Sunastian Falconer | 90.0 [85.1, 93.4] (n 200) | - (n 0) |
| 3 | `attack:6` | attack Acidic Slime | 90.8 [85.9, 94.0] (n 200) | - (n 0) |

**d9** (turn 12, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.5%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:8` | Primordial Pachyderm | 98.0 [83.4, 99.8] (n 25) | - (n 0) |
| 1 | `pass` | pass | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 2 | `cast:40` | Lifeforce | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:38` | Voldaren Epicure | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d10** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 98.0 [83.4, 99.8] (n 25) | - (n 0) |
| 1 | `cast:40` | Lifeforce | 88.0 [70.0, 95.8] (n 25) | - (n 0) |
| 2 | `cast:38` | Voldaren Epicure | 98.0 [83.4, 99.8] (n 25) | - (n 0) |
| 3 | `cast:3` | Goblin Surprise | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d11** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 97.2%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:6,8,39` | attack Acidic Slime+Sunastian Falconer+Primordial Pachyderm | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 98.0 [83.4, 99.8] (n 25) | - (n 0) |
| 2 | `attack:8,39` | attack Sunastian Falconer+Primordial Pachyderm | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 3 | `attack:6,8` | attack Acidic Slime+Primordial Pachyderm | 98.0 [83.4, 99.8] (n 25) | - (n 0) |
| 4 | `attack:6,39` | attack Acidic Slime+Sunastian Falconer | 98.0 [83.4, 99.8] (n 25) | - (n 0) |

6325 branch games (0 with an error, left out); 356 random and 0 Forge branches ended at the turn cap. In 1825 the copy lost 1825 "exiled with" link(s) (D479).

## Checks

290783 rows checked (ids against each seat's own frame log), 12652 frame logs through tools/check-redaction.mjs, 6325 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 11). The guardrails read back from 12650 random seats' logs: a land offered at 59536 of 857580 priority decisions and taken at 59536; 0 of 0 opening hands kept; G3 left out a repeated no-op 6746 time(s); G5 (D458): the engine refused 29 pick(s) it could not pay for, and 21 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

356 of 6325 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

