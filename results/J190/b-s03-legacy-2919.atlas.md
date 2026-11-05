# Move atlas: legacy-2819-00001 vs legacy-2819-00002, seed 2919

D451. Seat A is legacy-2819-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 24 turns, won by A, and listed 24 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 4 | p | 5 | 1 `cast:18`, 7.0 [1.0, 17.0] (n 150) | -, - (n 0) | - | - |
| d1 | 4 | p | 5 | 0 `cast:40`, 0.0 [0.0, 17.0] (n 50) | -, - (n 0) | - | - |
| d2 | 6 | p | 5 | 1 `cast:18`, 9.3 [3.3, 19.7] (n 150) | -, - (n 0) | - | - |
| d4 | 6 | p | 5 | 0 `cast:2`, 0.0 [0.0, 15.0] (n 50) | -, - (n 0) | - | - |
| d5 | 8 | p | 4 | 0 `pass`, 0.0 [0.0, 7.0] (n 50) | -, - (n 0) | - | - |
| d8 | 10 | p | 4 | 3 `cast:14`, 0.7 [0.0, 9.3] (n 150) | -, - (n 0) | - | - |
| d9 | 10 | p | 4 | 0 `cast:14`, 0.0 [0.0, 6.4] (n 150) | -, - (n 0) | - | - |
| d10 | 10 | p | 3 | 0 `cast:18`, 0.0 [0.0, 6.0] (n 50) | -, - (n 0) | - | - |
| d11 | 12 | p | 3 | 2 `cast:12`, 1.3 [0.0, 8.0] (n 150) | -, - (n 0) | - | - |
| d14 | 14 | p | 3 | 2 `cast:11`, 18.7 [12.7, 24.3] (n 150) | -, - (n 0) | - | - |

### The cut design (D480)

10 decision(s) branched, 6 of them in full (4 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100 random branches stopped 2 option(s): d2 o2 at 100, d9 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 4 (d1, d4, d5, d10), each a partial label at that n, never confident, saving at most 1700 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 66.7 [58.8, 73.7] (n 150) | - (n 0) |
| 1 | `cast:18` | Agatha's Soul Cauldron | 73.7 [66.1, 80.1] (n 150) | - (n 0) |
| 2 | `cast:40` | Scavenging Ooze | 70.0 [62.2, 76.8] (n 150) | - (n 0) |
| 3 | `cast:10` | Winter Orb | 69.7 [61.9, 76.5] (n 150) | - (n 0) |
| 4 | `cast:2` | Lovestruck Beast — Heart's Desire | 73.0 [65.4, 79.5] (n 150) | - (n 0) |

**d1** (turn 4, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:40` | Scavenging Ooze | 66.0 [52.1, 77.6] (n 50) | - (n 0) |
| 1 | `pass` | pass | 65.0 [51.1, 76.7] (n 50) | - (n 0) |
| 2 | `cast:18` | Agatha's Soul Cauldron | 59.0 [45.2, 71.5] (n 50) | - (n 0) |
| 3 | `cast:10` | Winter Orb | 63.0 [49.1, 75.0] (n 50) | - (n 0) |
| 4 | `cast:2` | Lovestruck Beast — Heart's Desire | 65.0 [51.1, 76.7] (n 50) | - (n 0) |

**d2** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 59.7 [51.7, 67.2] (n 150) | - (n 0) |
| 1 | `cast:18` | Agatha's Soul Cauldron | 69.0 [61.2, 75.8] (n 150) | - (n 0) |
| 2 | `cast:10` | Winter Orb | 61.5 [51.7, 70.4] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:2` | Lovestruck Beast | 67.7 [59.8, 74.6] (n 150) | - (n 0) |
| 4 | `cast:2` | Lovestruck Beast — Heart's Desire | 68.7 [60.9, 75.5] (n 150) | - (n 0) |

**d4** (turn 6, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:2` | Lovestruck Beast | 69.0 [55.2, 80.1] (n 50) | - (n 0) |
| 1 | `pass` | pass | 59.0 [45.2, 71.5] (n 50) | - (n 0) |
| 2 | `cast:18` | Agatha's Soul Cauldron | 68.0 [54.2, 79.2] (n 50) | - (n 0) |
| 3 | `cast:10` | Winter Orb | 57.0 [43.3, 69.7] (n 50) | - (n 0) |
| 4 | `cast:2` | Lovestruck Beast — Heart's Desire | 64.0 [50.1, 75.9] (n 50) | - (n 0) |

**d5** (turn 8, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 73.0 [59.4, 83.3] (n 50) | - (n 0) |
| 1 | `cast:18` | Agatha's Soul Cauldron | 63.0 [49.1, 75.0] (n 50) | - (n 0) |
| 2 | `cast:10` | Winter Orb | 59.0 [45.2, 71.5] (n 50) | - (n 0) |
| 3 | `cast:7` | Nevinyrral's Disk | 64.0 [50.1, 75.9] (n 50) | - (n 0) |

**d8** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 74.3 [66.8, 80.7] (n 150) | - (n 0) |
| 1 | `cast:18` | Agatha's Soul Cauldron | 73.0 [65.4, 79.5] (n 150) | - (n 0) |
| 2 | `cast:10` | Winter Orb | 72.0 [64.3, 78.6] (n 150) | - (n 0) |
| 3 | `cast:14` | Fanatic of Rhonas | 75.0 [67.5, 81.3] (n 150) | - (n 0) |

**d9** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:14` | Fanatic of Rhonas | 77.7 [70.4, 83.6] (n 150) | - (n 0) |
| 1 | `pass` | pass | 70.0 [56.3, 80.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:18` | Agatha's Soul Cauldron | 71.7 [64.0, 78.3] (n 150) | - (n 0) |
| 3 | `cast:10` | Winter Orb | 75.3 [67.9, 81.5] (n 150) | - (n 0) |

**d10** (turn 10, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Agatha's Soul Cauldron | 85.0 [72.6, 92.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 78.0 [64.8, 87.3] (n 50) | - (n 0) |
| 2 | `cast:10` | Winter Orb | 77.0 [63.7, 86.5] (n 50) | - (n 0) |

**d11** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 87.0 [80.7, 91.5] (n 150) | - (n 0) |
| 1 | `cast:10` | Winter Orb | 84.7 [78.0, 89.6] (n 150) | - (n 0) |
| 2 | `cast:12` | Carnage Tyrant | 88.3 [82.2, 92.5] (n 150) | - (n 0) |

**d14** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Endurance | 76.3 [68.9, 82.4] (n 150) | - (n 0) |
| 1 | `pass` | pass | 86.3 [79.9, 90.9] (n 150) | - (n 0) |
| 2 | `cast:11` | Endurance | 95.0 [90.3, 97.5] (n 150) | - (n 0) |

4300 branch games (0 with an error, left out); 645 random and 0 Forge branches ended at the turn cap.

## Checks

187202 rows checked (ids against each seat's own frame log), 8602 frame logs through tools/check-redaction.mjs, 4300 forks checked (0 not the position), 10 no-leak checks (0 moved; the negative control moved in 10). The guardrails read back from 8600 random seats' logs: a land offered at 50563 of 863534 priority decisions and taken at 50563; 0 of 0 opening hands kept; G3 left out a repeated no-op 780 time(s); G5 (D458): the engine refused 2132 pick(s) it could not pay for, and 2246 later offer(s) of them in the same priority window were left out; G6 (D471): 1364 pick(s) of the seats' own X plays had X drawn from 1 up, 39786 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem. Warnings (never a problem): 6, below.

### Branch games the turn cap ended

645 of 4300 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

- a warning: d1 option 0 `cast:40` (Scavenging Ooze): 16 of 50 branch game(s) were capped (random 16 of 50): 16 x ended at the turn cap
- a warning: d4 option 0 `cast:2` (Lovestruck Beast): 13 of 50 branch game(s) were capped (random 13 of 50): 13 x ended at the turn cap
- a warning: d5 option 0 `pass` (pass): 13 of 50 branch game(s) were capped (random 13 of 50): 13 x ended at the turn cap
- a warning: d5 option 2 `cast:10` (Winter Orb): 15 of 50 branch game(s) were capped (random 15 of 50): 15 x ended at the turn cap
- a warning: d8 option 2 `cast:10` (Winter Orb): 38 of 150 branch game(s) were capped (random 38 of 150): 38 x ended at the turn cap
- a warning: d9 option 3 `cast:10` (Winter Orb): 40 of 150 branch game(s) were capped (random 40 of 150): 40 x ended at the turn cap

