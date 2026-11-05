# Move atlas: pauper-2821-00001 vs pauper-2821-00002, seed 2921

D451. Seat A is pauper-2821-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 24 turns, won by A, and listed 36 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d5 | 8 | a | 4 | 0 `attack:none`, 0.0 [0.0, 6.0] (n 25) | -, - (n 0) | - | - |
| d7 | 10 | a | 4 | 2 `attack:3`, 10.0 [0.0, 22.1] (n 25) | -, - (n 0) | - | - |
| d9 | 12 | a | 4 | 0 `attack:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d12 | 14 | a | 4 | 1 `attack:3,19`, 8.0 [0.0, 20.0] (n 25) | -, - (n 0) | - | - |
| d16 | 16 | a | 4 | 3 `attack:19`, 2.0 [0.0, 7.7] (n 150) | -, - (n 0) | - | - |
| d21 | 18 | a | 4 | 0 `attack:none`, 0.0 [0.0, 9.0] (n 50) | -, - (n 0) | - | - |
| d25 | 20 | a | 5 | 4 `attack:5,19`, 1.3 [0.0, 11.0] (n 150) | -, - (n 0) | - | - |
| d26 | 20 | p | 3 | 0 `cast:13`, 0.0 [0.0, 0.0] (n 50) | -, - (n 0) | - | - |
| d27 | 20 | p | 3 | 2 `cast:7`, 5.0 [0.0, 14.0] (n 150) | -, - (n 0) | - | - |
| d29 | 22 | a | 7 | 2 `attack:3,5,11,19`, 4.0 [0.0, 12.7] (n 150) | -, - (n 0) | - | - |
| d30 | 22 | p | 3 | 2 `cast:35`, 9.0 [0.0, 18.3] (n 150) | -, - (n 0) | - | - |
| d31 | 22 | p | 3 | 0 `cast:7`, 0.0 [0.0, 15.0] (n 50) | -, - (n 0) | - | - |
| d33 | 24 | p | 3 | 1 `pass`, 0.3 [0.0, 7.0] (n 150) | -, - (n 0) | - | - |
| d35 | 24 | a | 6 | 0 `attack:5,11,19`, 0.0 [0.0, 3.0] (n 50) | -, - (n 0) | - | - |

### The cut design (D480)

14 decision(s) branched, 6 of them in full (4 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 4: d5 (mean value 1.5%, replaced by d9), d7 (mean value 3.5%, replaced by d21), d12 (mean value 3.0%, replaced by d27), d9 (mean value 0.0%, replaced by d31). Early stopping at 50/100 random branches stopped 5 option(s): d16 o1 at 50, d16 o2 at 50, d29 o1 at 50, d29 o3 at 50, d29 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 4 (d26, d35, d21, d31), each a partial label at that n, never confident, saving at most 1600 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d5** (turn 8, a; option 0 is Forge's answer) -- settled by the screen (mean value 1.5%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 1 | `attack:3,19` | attack Ornithopter+Prodigal Sorcerer | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 2 | `attack:3` | attack Ornithopter | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:19` | attack Prodigal Sorcerer | 2.0 [0.2, 16.6] (n 25) | - (n 0) |

**d7** (turn 10, a; option 0 is Forge's answer) -- settled by the screen (mean value 3.5%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 1 | `attack:3,19` | attack Ornithopter+Prodigal Sorcerer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:3` | attack Ornithopter | 12.0 [4.2, 30.0] (n 25) | - (n 0) |
| 3 | `attack:19` | attack Prodigal Sorcerer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d9** (turn 12, a; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:3,19` | attack Ornithopter+Prodigal Sorcerer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:3` | attack Ornithopter | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:19` | attack Prodigal Sorcerer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d12** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 3.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:3,19` | attack Ornithopter+Prodigal Sorcerer | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 2 | `attack:3` | attack Ornithopter | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:19` | attack Prodigal Sorcerer | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d16** (turn 16, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 4.3 [2.1, 8.9] (n 150) | - (n 0) |
| 1 | `attack:3,19` | attack Ornithopter+Prodigal Sorcerer | 5.0 [1.6, 14.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:3` | attack Ornithopter | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:19` | attack Prodigal Sorcerer | 6.3 [3.4, 11.4] (n 150) | - (n 0) |

**d21** (turn 18, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 13.0 [6.3, 25.0] (n 50) | - (n 0) |
| 1 | `attack:3,19` | attack Ornithopter+Prodigal Sorcerer | 10.0 [4.3, 21.4] (n 50) | - (n 0) |
| 2 | `attack:3` | attack Ornithopter | 4.0 [1.1, 13.5] (n 50) | - (n 0) |
| 3 | `attack:19` | attack Prodigal Sorcerer | 4.0 [1.1, 13.5] (n 50) | - (n 0) |

**d25** (turn 20, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:5` | attack Ardent Elementalist | 20.3 [14.7, 27.5] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 16.3 [11.3, 23.1] (n 150) | - (n 0) |
| 2 | `attack:3,5,19` | attack Ardent Elementalist+Ornithopter+Prodigal Sorcerer | 16.3 [11.3, 23.1] (n 150) | - (n 0) |
| 3 | `attack:3,5` | attack Ardent Elementalist+Ornithopter | 20.3 [14.7, 27.5] (n 150) | - (n 0) |
| 4 | `attack:5,19` | attack Ardent Elementalist+Prodigal Sorcerer | 21.7 [15.8, 28.9] (n 150) | - (n 0) |

**d26** (turn 20, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Stress Dream | 49.0 [35.7, 62.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 31.0 [19.9, 44.8] (n 50) | - (n 0) |
| 2 | `cast:11` | Dandân | 26.0 [15.9, 39.6] (n 50) | - (n 0) |

**d27** (turn 20, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Dandân | 37.3 [30.0, 45.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 40.0 [32.5, 48.0] (n 150) | - (n 0) |
| 2 | `cast:7` | Think Twice | 42.3 [34.7, 50.3] (n 150) | - (n 0) |

**d29** (turn 22, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:5,11` | attack Ardent Elementalist+Dandân | 67.0 [59.1, 74.0] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 43.0 [30.3, 56.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:3,5,11,19` | attack Ardent Elementalist+Dandân+Ornithopter+Prodigal Sorcerer | 71.0 [63.3, 77.7] (n 150) | - (n 0) |
| 3 | `attack:11` | attack Dandân | 48.0 [34.8, 61.5] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:5` | attack Ardent Elementalist | 45.0 [32.1, 58.7] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:3,5,11` | attack Ardent Elementalist+Dandân+Ornithopter | 68.3 [60.5, 75.2] (n 150) | - (n 0) |
| 6 | `attack:5,11,19` | attack Ardent Elementalist+Dandân+Prodigal Sorcerer | 71.0 [63.3, 77.7] (n 150) | - (n 0) |

**d30** (turn 22, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:7` | Think Twice | 66.3 [58.5, 73.4] (n 150) | - (n 0) |
| 1 | `pass` | pass | 66.7 [58.8, 73.7] (n 150) | - (n 0) |
| 2 | `cast:35` | Thought Scour | 75.3 [67.9, 81.5] (n 150) | - (n 0) |

**d31** (turn 22, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:7` | Think Twice | 64.0 [50.1, 75.9] (n 50) | - (n 0) |
| 1 | `pass` | pass | 62.0 [48.1, 74.1] (n 50) | - (n 0) |
| 2 | `cast:35` | Thought Scour | 59.0 [45.2, 71.5] (n 50) | - (n 0) |

**d33** (turn 24, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Boomerang Basics | 76.0 [68.6, 82.1] (n 150) | - (n 0) |
| 1 | `pass` | pass | 76.3 [68.9, 82.4] (n 150) | - (n 0) |
| 2 | `cast:8` | Lórien Revealed | 66.3 [58.5, 73.4] (n 150) | - (n 0) |

**d35** (turn 24, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:5,11,19` | attack Prodigal Sorcerer+Ardent Elementalist+Dandân | 96.0 [86.5, 98.9] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 61.0 [47.2, 73.3] (n 50) | - (n 0) |
| 2 | `attack:3,5,11,19` | attack Prodigal Sorcerer+Ardent Elementalist+Dandân+Ornithopter | 96.0 [86.5, 98.9] (n 50) | - (n 0) |
| 3 | `attack:5,11` | attack Ardent Elementalist+Dandân | 87.0 [75.0, 93.7] (n 50) | - (n 0) |
| 4 | `attack:11,19` | attack Prodigal Sorcerer+Dandân | 88.0 [76.2, 94.4] (n 50) | - (n 0) |
| 5 | `attack:5,19` | attack Prodigal Sorcerer+Ardent Elementalist | 88.0 [76.2, 94.4] (n 50) | - (n 0) |

4450 branch games (0 with an error, left out); 452 random and 0 Forge branches ended at the turn cap.

## Checks

133064 rows checked (ids against each seat's own frame log), 8902 frame logs through tools/check-redaction.mjs, 4450 forks checked (0 not the position), 14 no-leak checks (0 moved; the negative control moved in 14). The guardrails read back from 8900 random seats' logs: a land offered at 28423 of 304061 priority decisions and taken at 28423; 0 of 0 opening hands kept; G3 left out a repeated no-op 3690 time(s); G5 (D458): the engine refused 2022 pick(s) it could not pay for, and 1743 later offer(s) of them in the same priority window were left out; G6 (D471): 830 pick(s) of the seats' own X plays had X drawn from 1 up, 1299 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem. Warnings (never a problem): 2, below.

### Branch games the turn cap ended

452 of 4450 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

- a warning: d27 option 0 `cast:11` (Dandân): 38 of 150 branch game(s) were capped (random 38 of 150): 38 x ended at the turn cap
- a warning: d35 option 1 `attack:none` (attack none): 13 of 50 branch game(s) were capped (random 13 of 50): 13 x ended at the turn cap

