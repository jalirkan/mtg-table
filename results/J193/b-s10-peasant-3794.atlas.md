# Move atlas: peasant-3694-00001 vs peasant-3694-00002, seed 3794

D451. Seat A is peasant-3694-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 21 turns, won by A, and listed 22 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 3 | p | 3 | 2 `cast:12`, 4.7 [0.0, 12.0] (n 150) | -, - (n 0) | - | - |
| d1 | 3 | p | 3 | 1 `pass`, 10.3 [2.7, 19.3] (n 150) | -, - (n 0) | - | - |
| d2 | 5 | p | 3 | 1 `cast:12`, 6.7 [0.0, 16.0] (n 150) | -, - (n 0) | - | - |
| d4 | 7 | p | 4 | 0 `pass`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d5 | 7 | p | 4 | 0 `cast:6`, 0.0 [0.0, 12.0] (n 50) | -, - (n 0) | - | - |
| d6 | 7 | p | 3 | 0 `cast:12`, 0.0 [0.0, 6.7] (n 150) | -, - (n 0) | - | - |
| d9 | 11 | a | 3 | 0 `attack:8`, 0.0 [0.0, 4.3] (n 150) | -, - (n 0) | - | - |
| d16 | 17 | a | 5 | 2 `attack:6,26,38`, 4.3 [0.0, 10.3] (n 150) | -, - (n 0) | - | - |
| d18 | 19 | a | 6 | 0 `attack:6,36,38`, 0.0 [0.0, 1.0] (n 50) | -, - (n 0) | - | - |
| d19 | 19 | p | 2 | 0 `cast:22`, 0.0 [0.0, 2.0] (n 50) | -, - (n 0) | - | - |
| d20 | 21 | p | 2 | 0 `cast:37`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d21 | 21 | a | 5 | 0 `attack:6,36,38`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

12 decision(s) branched, 6 of them in full (4 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 2: d21 (mean value 99.2%, replaced by d20), d20 (mean value 100.0%, replaced by d19). Early stopping at 50/100 random branches stopped 2 option(s): d0 o1 at 100, d9 o1 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 5. It stopped 4 (d4, d5, d18, d19), each a partial label at that n, never confident, saving at most 1600 branch games; 1 it would have stopped played on to the full n as controls (d6; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 81.0 [74.0, 86.5] (n 150) | - (n 0) |
| 1 | `cast:8` | Shi'ar Soldier | 73.5 [64.1, 81.2] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:12` | Life of Toshiro Umezawa | 85.7 [79.2, 90.4] (n 150) | - (n 0) |

**d1** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:8` | Shi'ar Soldier | 69.0 [61.2, 75.8] (n 150) | - (n 0) |
| 1 | `pass` | pass | 79.3 [72.2, 85.0] (n 150) | - (n 0) |
| 2 | `cast:12` | Life of Toshiro Umezawa | 77.0 [69.6, 83.0] (n 150) | - (n 0) |

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 62.3 [54.4, 69.7] (n 150) | - (n 0) |
| 1 | `cast:12` | Life of Toshiro Umezawa | 69.0 [61.2, 75.8] (n 150) | - (n 0) |
| 2 | `cast:25` | Drown in the Loch | 61.7 [53.7, 69.1] (n 150) | - (n 0) |

**d4** (turn 7, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 83.0 [70.3, 91.0] (n 50) | - (n 0) |
| 1 | `cast:6` | Vinereap Mentor | 76.0 [62.6, 85.7] (n 50) | - (n 0) |
| 2 | `cast:12` | Life of Toshiro Umezawa | 81.0 [68.1, 89.5] (n 50) | - (n 0) |
| 3 | `cast:25` | Drown in the Loch | 81.0 [68.1, 89.5] (n 50) | - (n 0) |

**d5** (turn 7, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Vinereap Mentor | 92.0 [81.2, 96.9] (n 50) | - (n 0) |
| 1 | `pass` | pass | 90.0 [78.6, 95.7] (n 50) | - (n 0) |
| 2 | `cast:12` | Life of Toshiro Umezawa | 92.0 [81.2, 96.9] (n 50) | - (n 0) |
| 3 | `cast:25` | Drown in the Loch | 92.0 [81.2, 96.9] (n 50) | - (n 0) |

**d6** (turn 7, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:12` | Life of Toshiro Umezawa | 86.7 [80.3, 91.2] (n 150) | - (n 0) |
| 1 | `pass` | pass | 85.3 [78.8, 90.1] (n 150) | - (n 0) |
| 2 | `cast:25` | Drown in the Loch | 84.3 [77.7, 89.3] (n 150) | - (n 0) |

**d9** (turn 11, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:8` | attack Shi'ar Soldier | 67.7 [59.8, 74.6] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 51.0 [41.3, 60.6] (n 100, stopped at 100) | - (n 0) |
| 2 | `attack:6,8` | attack Shi'ar Soldier+Vinereap Mentor | 63.0 [55.0, 70.3] (n 150) | - (n 0) |

**d16** (turn 17, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:6,38` | attack Vinereap Mentor+Quirion Dryad | 88.3 [82.2, 92.5] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 86.3 [79.9, 90.9] (n 150) | - (n 0) |
| 2 | `attack:6,26,38` | attack Vinereap Mentor+Quirion Dryad+Prodigal Sorcerer | 92.7 [87.4, 95.9] (n 150) | - (n 0) |
| 3 | `attack:38` | attack Quirion Dryad | 89.3 [83.4, 93.3] (n 150) | - (n 0) |
| 4 | `attack:6` | attack Vinereap Mentor | 86.7 [80.3, 91.2] (n 150) | - (n 0) |

**d18** (turn 19, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:6,36,38` | attack Reclamation Sage+Vinereap Mentor+Quirion Dryad | 99.0 [91.1, 99.9] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 92.0 [81.2, 96.9] (n 50) | - (n 0) |
| 2 | `attack:6,26,36,38` | attack Reclamation Sage+Vinereap Mentor+Quirion Dryad+Prodigal Sorcerer | 94.0 [83.8, 97.9] (n 50) | - (n 0) |
| 3 | `attack:6,38` | attack Vinereap Mentor+Quirion Dryad | 93.0 [82.5, 97.4] (n 50) | - (n 0) |
| 4 | `attack:36,38` | attack Reclamation Sage+Quirion Dryad | 96.0 [86.5, 98.9] (n 50) | - (n 0) |
| 5 | `attack:6,36` | attack Reclamation Sage+Vinereap Mentor | 99.0 [91.1, 99.9] (n 50) | - (n 0) |

**d19** (turn 19, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:22` | Mirkwood Pathmaker | 97.0 [88.0, 99.3] (n 50) | - (n 0) |
| 1 | `pass` | pass | 94.0 [83.8, 97.9] (n 50) | - (n 0) |

**d20** (turn 21, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Faerie Vandal | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d21** (turn 21, a; option 0 is Forge's answer) -- settled by the screen (mean value 99.2%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:6,36,38` | attack Reclamation Sage+Vinereap Mentor+Quirion Dryad | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `attack:6,38` | attack Vinereap Mentor+Quirion Dryad | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:36,38` | attack Reclamation Sage+Quirion Dryad | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:6,36` | attack Reclamation Sage+Vinereap Mentor | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

3875 branch games (0 with an error, left out); 132 random and 0 Forge branches ended at the turn cap.

## Checks

172263 rows checked (ids against each seat's own frame log), 7752 frame logs through tools/check-redaction.mjs, 3875 forks checked (0 not the position), 12 no-leak checks (0 moved; the negative control moved in 10). The guardrails read back from 7750 random seats' logs: a land offered at 45372 of 387491 priority decisions and taken at 45372; 0 of 0 opening hands kept; G3 left out a repeated no-op 2421 time(s); G5 (D458): the engine refused 1 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

132 of 3875 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

