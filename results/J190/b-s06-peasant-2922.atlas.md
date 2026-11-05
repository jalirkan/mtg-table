# Move atlas: peasant-2822-00001 vs peasant-2822-00002, seed 2922

D451. Seat A is peasant-2822-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 36 turns, won by A, and listed 44 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d6 | 11 | p | 3 | 1 `cast:39`, 4.0 [0.0, 14.3] (n 150) | -, - (n 0) | - | - |
| d8 | 13 | p | 3 | 0 `pass`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d13 | 15 | a | 3 | 0 `attack:18`, 0.0 [0.0, 6.7] (n 150) | -, - (n 0) | - | - |
| d17 | 17 | p | 4 | 1 `cast:10`, 8.0 [0.0, 16.7] (n 150) | -, - (n 0) | - | - |
| d20 | 19 | p | 4 | 0 `pass`, 0.0 [0.0, 8.0] (n 150) | -, - (n 0) | - | - |
| d22 | 19 | p | 4 | 0 `cast:21`, 0.0 [0.0, 7.0] (n 50) | -, - (n 0) | - | - |
| d29 | 23 | a | 8 | 2 `attack:10,21,131,143,146,153,156`, 1.0 [0.0, 10.0] (n 150) | -, - (n 0) | - | - |
| d33 | 27 | a | 8 | 1 `attack:10,18,21,26,56,67,131,143,146,153,156,163`, 41.7 [31.3, 50.3] (n 150) | -, - (n 0) | - | - |
| d38 | 32 | b | 8 | 4 `block:21>73,146>73`, 2.0 [0.0, 10.0] (n 150) | -, - (n 0) | - | - |
| d40 | 33 | a | 8 | 0 `attack:none`, 0.0 [0.0, 2.7] (n 150) | -, - (n 0) | - | - |
| d42 | 35 | a | 8 | 0 `attack:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 1: d42 (mean value 98.0%, replaced by d40). Early stopping at 50/100 random branches stopped 14 option(s): d17 o3 at 100, d29 o6 at 50, d33 o2 at 50, d33 o3 at 50, d33 o4 at 50, d33 o5 at 50, d33 o6 at 50, d33 o7 at 50, d38 o1 at 50, d38 o2 at 50, d38 o3 at 50, d38 o6 at 50, d38 o7 at 50, d40 o1 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 2 (d8, d22), each a partial label at that n, never confident, saving at most 700 branch games; 1 it would have stopped played on to the full n as controls (d40; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d6** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 62.7 [54.7, 70.0] (n 150) | - (n 0) |
| 1 | `cast:39` | Spider Spawning | 66.7 [58.8, 73.7] (n 150) | - (n 0) |
| 2 | `cast:18` | Clockwork Avian | 66.7 [58.8, 73.7] (n 150) | - (n 0) |

**d8** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 69.0 [55.2, 80.1] (n 50) | - (n 0) |
| 1 | `cast:39` | Spider Spawning | 60.0 [46.2, 72.4] (n 50) | - (n 0) |
| 2 | `cast:25` | Oketra's Monument | 64.0 [50.1, 75.9] (n 50) | - (n 0) |

**d13** (turn 15, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:18` | attack Clockwork Avian | 78.3 [71.1, 84.2] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 75.0 [67.5, 81.3] (n 150) | - (n 0) |
| 2 | `attack:18,131` | attack Clockwork Avian+Spider Token | 75.0 [67.5, 81.3] (n 150) | - (n 0) |

**d17** (turn 17, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 63.3 [55.4, 70.6] (n 150) | - (n 0) |
| 1 | `cast:10` | Serra Angel | 71.3 [63.6, 78.0] (n 150) | - (n 0) |
| 2 | `cast:25` | Oketra's Monument | 58.0 [50.0, 65.6] (n 150) | - (n 0) |
| 3 | `cast:21` | Hero of the Dunes | 54.0 [44.3, 63.4] (n 100, stopped at 100) | - (n 0) |

**d20** (turn 19, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 70.0 [62.2, 76.8] (n 150) | - (n 0) |
| 1 | `cast:25` | Oketra's Monument | 66.7 [58.8, 73.7] (n 150) | - (n 0) |
| 2 | `cast:21` | Hero of the Dunes | 65.3 [57.4, 72.5] (n 150) | - (n 0) |
| 3 | `cast:35` | Aladdin | 67.0 [59.1, 74.0] (n 150) | - (n 0) |

**d22** (turn 19, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Hero of the Dunes | 81.0 [68.1, 89.5] (n 50) | - (n 0) |
| 1 | `pass` | pass | 68.0 [54.2, 79.2] (n 50) | - (n 0) |
| 2 | `cast:25` | Oketra's Monument | 70.0 [56.3, 80.9] (n 50) | - (n 0) |
| 3 | `cast:35` | Aladdin | 54.0 [40.4, 67.0] (n 50) | - (n 0) |

**d29** (turn 23, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:10` | attack Serra Angel | 83.0 [76.2, 88.2] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 82.7 [75.8, 87.9] (n 150) | - (n 0) |
| 2 | `attack:10,21,131,143,146,153,156` | attack Serra Angel+Spider Token+Spider Token+Construct Token+Hero of the Dunes+Construct Token+Warrior Token | 84.0 [77.3, 89.0] (n 150) | - (n 0) |
| 3 | `attack:10,131` | attack Serra Angel+Spider Token | 83.3 [76.5, 88.4] (n 150) | - (n 0) |
| 4 | `attack:10,143` | attack Serra Angel+Spider Token | 83.3 [76.5, 88.4] (n 150) | - (n 0) |
| 5 | `attack:10,146` | attack Serra Angel+Construct Token | 80.7 [73.6, 86.2] (n 150) | - (n 0) |
| 6 | `attack:10,21` | attack Serra Angel+Hero of the Dunes | 69.0 [55.2, 80.1] (n 50, stopped at 50) | - (n 0) |
| 7 | `attack:10,153` | attack Serra Angel+Construct Token | 83.7 [76.9, 88.7] (n 150) | - (n 0) |

**d33** (turn 27, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 44.7 [36.9, 52.7] (n 150) | - (n 0) |
| 1 | `attack:10,18,21,26,56,67,131,143,146,153,156,163` | attack Spider Token+Spider Token+Construct Token+Serra Angel+Hero of the Dunes+Construct Token+Warrior Token+Clockwork Avian+Pizza Face, Gastromancer+Warrior Token+Descendant of Storms+Bomat Courier | 86.3 [79.9, 90.9] (n 150) | - (n 0) |
| 2 | `attack:131` | attack Spider Token | 39.0 [26.7, 52.8] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:143` | attack Spider Token | 39.0 [26.7, 52.8] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:146` | attack Construct Token | 46.0 [33.0, 59.6] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:10` | attack Serra Angel | 30.0 [19.1, 43.8] (n 50, stopped at 50) | - (n 0) |
| 6 | `attack:21` | attack Hero of the Dunes | 40.0 [27.6, 53.8] (n 50, stopped at 50) | - (n 0) |
| 7 | `attack:153` | attack Construct Token | 34.0 [22.4, 47.9] (n 50, stopped at 50) | - (n 0) |

**d38** (turn 32, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:146>73` | block Construct Token>Spinewoods Armadillo | 84.0 [77.3, 89.0] (n 150) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `block:131>73,146>73` | block Construct Token>Spinewoods Armadillo, Spider Token>Spinewoods Armadillo | 72.0 [58.3, 82.5] (n 50, stopped at 50) | - (n 0) |
| 3 | `block:143>73,146>73` | block Construct Token>Spinewoods Armadillo, Spider Token>Spinewoods Armadillo | 72.0 [58.3, 82.5] (n 50, stopped at 50) | - (n 0) |
| 4 | `block:21>73,146>73` | block Construct Token>Spinewoods Armadillo, Hero of the Dunes>Spinewoods Armadillo | 86.0 [79.5, 90.7] (n 150) | - (n 0) |
| 5 | `block:146>73,153>73` | block Construct Token>Spinewoods Armadillo, Construct Token>Spinewoods Armadillo | 78.0 [70.7, 83.9] (n 150) | - (n 0) |
| 6 | `block:146>73,156>73` | block Construct Token>Spinewoods Armadillo, Warrior Token>Spinewoods Armadillo | 76.0 [62.6, 85.7] (n 50, stopped at 50) | - (n 0) |
| 7 | `block:67>73,146>73` | block Construct Token>Spinewoods Armadillo, Pizza Face, Gastromancer>Spinewoods Armadillo | 62.0 [48.1, 74.1] (n 50, stopped at 50) | - (n 0) |

**d40** (turn 33, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 92.7 [87.4, 95.9] (n 150) | - (n 0) |
| 1 | `attack:21,26,56,67,131,143,153,156,163,168,189` | attack Spider Token+Spider Token+Hero of the Dunes+Construct Token+Warrior Token+Pizza Face, Gastromancer+Warrior Token+Descendant of Storms+Bomat Courier+Soldier Token+Robot Token | 69.0 [59.4, 77.2] (n 100, stopped at 100) | - (n 0) |
| 2 | `attack:131` | attack Spider Token | 87.3 [81.1, 91.7] (n 150) | - (n 0) |
| 3 | `attack:143` | attack Spider Token | 87.3 [81.1, 91.7] (n 150) | - (n 0) |
| 4 | `attack:21` | attack Hero of the Dunes | 86.0 [79.5, 90.7] (n 150) | - (n 0) |
| 5 | `attack:153` | attack Construct Token | 88.0 [81.8, 92.3] (n 150) | - (n 0) |
| 6 | `attack:156` | attack Warrior Token | 88.7 [82.6, 92.8] (n 150) | - (n 0) |
| 7 | `attack:67` | attack Pizza Face, Gastromancer | 85.3 [78.8, 90.1] (n 150) | - (n 0) |

**d42** (turn 35, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:21,26,56,67,131,143,153,156,163,168,189` | attack Spider Token+Spider Token+Hero of the Dunes+Construct Token+Warrior Token+Pizza Face, Gastromancer+Warrior Token+Descendant of Storms+Bomat Courier+Soldier Token+Robot Token | 84.0 [65.3, 93.6] (n 25) | - (n 0) |
| 2 | `attack:131` | attack Spider Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:143` | attack Spider Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:21` | attack Hero of the Dunes | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:153` | attack Construct Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:156` | attack Warrior Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:67` | attack Pizza Face, Gastromancer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

6150 branch games (0 with an error, left out); 41 random and 0 Forge branches ended at the turn cap.

## Checks

146347 rows checked (ids against each seat's own frame log), 12302 frame logs through tools/check-redaction.mjs, 6150 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 10). The guardrails read back from 12300 random seats' logs: a land offered at 21310 of 429491 priority decisions and taken at 21310; 0 of 0 opening hands kept; G3 left out a repeated no-op 120 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 8514 pick(s) of the seats' own X plays had X drawn from 1 up, 2194 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

41 of 6150 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

