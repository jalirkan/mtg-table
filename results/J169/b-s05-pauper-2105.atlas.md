# Move atlas: pauper-2005-00001 vs pauper-2005-00002, seed 2105

D451. Seat A is pauper-2005-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 14 turns, won by A, and listed 14 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 4 | p | 3 | 1 `cast:2`, 5.3 [0.0, 12.5] (n 200) | -, - (n 0) | - | - |
| d2 | 6 | p | 3 | 0 `pass`, 0.0 [0.0, 5.5] (n 200) | -, - (n 0) | - | - |
| d3 | 6 | p | 3 | 0 `cast:10`, 0.0 [0.0, 2.9] (n 200) | -, - (n 0) | - | - |
| d5 | 8 | p | 6 | 5 `cast:6`, 1.5 [0.0, 9.0] (n 200) | -, - (n 0) | - | - |
| d8 | 12 | p | 5 | 4 `cast:38`, 7.8 [2.5, 14.8] (n 200) | -, - (n 0) | - | - |
| d10 | 12 | a | 4 | 0 `attack:6,39`, 0.0 [0.0, 2.5] (n 200) | -, - (n 0) | - | - |
| d11 | 12 | p | 4 | 0 `cast:8`, 0.0 [0.0, 0.5] (n 200) | -, - (n 0) | - | - |
| d13 | 14 | a | 5 | 0 `attack:6,8,39`, 0.0 [0.0, 0.8] (n 200) | -, - (n 0) | - | - |

### The cut design (D480)

8 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100/150 random branches stopped 10 option(s): d2 o1 at 100, d3 o2 at 150, d5 o1 at 100, d5 o2 at 50, d5 o4 at 100, d10 o1 at 50, d11 o1 at 50, d11 o2 at 100, d13 o1 at 50, d13 o4 at 150 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 37.8 [31.3, 44.6] (n 200) | - (n 0) |
| 1 | `cast:2` | Abrade | 43.0 [36.3, 49.9] (n 200) | - (n 0) |
| 2 | `cast:1` | Suplex | 39.5 [33.0, 46.4] (n 200) | - (n 0) |

**d2** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 64.0 [57.1, 70.3] (n 200) | - (n 0) |
| 1 | `cast:1` | Suplex | 52.5 [42.8, 62.0] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:10` | Potioner's Trove | 60.5 [53.6, 67.0] (n 200) | - (n 0) |

**d3** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:10` | Potioner's Trove | 63.0 [56.1, 69.4] (n 200) | - (n 0) |
| 1 | `pass` | pass | 58.0 [51.1, 64.6] (n 200) | - (n 0) |
| 2 | `cast:1` | Suplex | 53.0 [45.0, 60.8] (n 150, stopped at 150) | - (n 0) |

**d5** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:39` | Sunastian Falconer | 68.5 [61.8, 74.5] (n 200) | - (n 0) |
| 1 | `pass` | pass | 53.0 [43.3, 62.5] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:8` | Primordial Pachyderm | 54.0 [40.4, 67.0] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:40` | Lifeforce | 66.5 [59.7, 72.7] (n 200) | - (n 0) |
| 4 | `cast:1` | Suplex | 53.5 [43.8, 63.0] (n 100, stopped at 100) | - (n 0) |
| 5 | `cast:6` | Acidic Slime | 70.0 [63.3, 75.9] (n 200) | - (n 0) |

**d8** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Suplex | 77.0 [70.7, 82.3] (n 200) | - (n 0) |
| 1 | `pass` | pass | 82.8 [76.9, 87.4] (n 200) | - (n 0) |
| 2 | `cast:8` | Primordial Pachyderm | 82.0 [76.1, 86.7] (n 200) | - (n 0) |
| 3 | `cast:40` | Lifeforce | 80.5 [74.5, 85.4] (n 200) | - (n 0) |
| 4 | `cast:38` | Voldaren Epicure | 84.8 [79.1, 89.1] (n 200) | - (n 0) |

**d10** (turn 12, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:6,39` | attack Acidic Slime+Sunastian Falconer | 90.5 [85.6, 93.8] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 82.0 [69.2, 90.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:39` | attack Sunastian Falconer | 86.5 [81.1, 90.5] (n 200) | - (n 0) |
| 3 | `attack:6` | attack Acidic Slime | 85.3 [79.7, 89.5] (n 200) | - (n 0) |

**d11** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:8` | Primordial Pachyderm | 91.8 [87.1, 94.8] (n 200) | - (n 0) |
| 1 | `pass` | pass | 79.0 [65.9, 88.0] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:40` | Lifeforce | 84.0 [75.6, 89.9] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:38` | Voldaren Epicure | 86.0 [80.5, 90.1] (n 200) | - (n 0) |

**d13** (turn 14, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:6,8,39` | attack Acidic Slime+Sunastian Falconer+Primordial Pachyderm | 95.8 [92.0, 97.8] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 76.0 [62.6, 85.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:8,39` | attack Sunastian Falconer+Primordial Pachyderm | 92.5 [88.0, 95.4] (n 200) | - (n 0) |
| 3 | `attack:6,8` | attack Acidic Slime+Primordial Pachyderm | 91.0 [86.2, 94.2] (n 200) | - (n 0) |
| 4 | `attack:6,39` | attack Acidic Slime+Sunastian Falconer | 90.0 [84.2, 93.8] (n 150, stopped at 150) | - (n 0) |

5500 branch games (0 with an error, left out); 302 random and 0 Forge branches ended at the turn cap. In 2000 the copy lost 2000 "exiled with" link(s) (D479).

## Checks

253757 rows checked (ids against each seat's own frame log), 11002 frame logs through tools/check-redaction.mjs, 5500 forks checked (0 not the position), 8 no-leak checks (0 moved; the negative control moved in 8). The guardrails read back from 11000 random seats' logs: a land offered at 50433 of 1012333 priority decisions and taken at 50433; 0 of 0 opening hands kept; G3 left out a repeated no-op 6148 time(s); G5 (D458): the engine refused 1 pick(s) it could not pay for, and 1 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

302 of 5500 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

