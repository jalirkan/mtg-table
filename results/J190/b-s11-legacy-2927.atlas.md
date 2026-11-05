# Move atlas: legacy-2827-00001 vs legacy-2827-00002, seed 2927

D451. Seat A is legacy-2827-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 18 turns, won by A, and listed 19 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 4 | p | 2 | 0 `pass`, 0.0 [0.0, 3.0] (n 50) | -, - (n 0) | - | - |
| d2 | 6 | p | 3 | 2 `cast:17`, 8.3 [0.0, 17.3] (n 150) | -, - (n 0) | - | - |
| d3 | 6 | p | 3 | 0 `cast:17`, 0.0 [0.0, 0.0] (n 50) | -, - (n 0) | - | - |
| d4 | 8 | p | 3 | 0 `cast:23`, 0.0 [0.0, 7.3] (n 150) | -, - (n 0) | - | - |
| d10 | 12 | a | 4 | 0 `attack:17,22`, 0.0 [0.0, 11.0] (n 150) | -, - (n 0) | - | - |
| d13 | 14 | p | 4 | 3 `cast:15`, 2.7 [0.0, 10.0] (n 150) | -, - (n 0) | - | - |
| d14 | 14 | a | 2 | 0 `attack:17`, 0.0 [0.0, 1.7] (n 150) | -, - (n 0) | - | - |
| d15 | 16 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 50) | -, - (n 0) | - | - |
| d16 | 16 | a | 5 | 3 `attack:9,17`, 5.0 [1.0, 9.3] (n 150) | -, - (n 0) | - | - |
| d17 | 18 | p | 4 | 3 `cast:12`, 1.7 [0.0, 4.7] (n 150) | -, - (n 0) | - | - |
| d18 | 18 | a | 5 | 0 `attack:2,9,17`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 7 of them in full (3 more stopped by the futility rule, D489); picked among those with 3 or more options first (2 filled from the rest). The screen at 25 random branches settled 1: d18 (mean value 98.0%, replaced by d14). Early stopping at 50/100 random branches stopped 5 option(s): d2 o1 at 100, d13 o2 at 50, d16 o1 at 100, d17 o1 at 50, d17 o2 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 7. It stopped 3 (d0, d3, d15), each a partial label at that n, never confident, saving at most 700 branch games; 4 it would have stopped played on to the full n as controls (d10, d16, d17, d14; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 4, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 69.0 [55.2, 80.1] (n 50) | - (n 0) |
| 1 | `cast:4` | Thing in the Ice | 54.0 [40.4, 67.0] (n 50) | - (n 0) |

**d2** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 65.3 [57.4, 72.5] (n 150) | - (n 0) |
| 1 | `cast:22` | Six | 59.5 [49.7, 68.6] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:17` | Nadu, Winged Wisdom | 73.7 [66.1, 80.1] (n 150) | - (n 0) |

**d3** (turn 6, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Nadu, Winged Wisdom | 79.0 [65.9, 88.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 54.0 [40.4, 67.0] (n 50) | - (n 0) |
| 2 | `cast:22` | Six | 59.0 [45.2, 71.5] (n 50) | - (n 0) |

**d4** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:23` | Primal Might | 74.0 [66.4, 80.4] (n 150) | - (n 0) |
| 1 | `pass` | pass | 72.3 [64.7, 78.9] (n 150) | - (n 0) |
| 2 | `cast:22` | Six | 68.0 [60.2, 74.9] (n 150) | - (n 0) |

**d10** (turn 12, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:17,22` | attack Nadu, Winged Wisdom+Six | 57.7 [49.7, 65.3] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 54.0 [46.0, 61.8] (n 150) | - (n 0) |
| 2 | `attack:22` | attack Six | 53.7 [45.7, 61.5] (n 150) | - (n 0) |
| 3 | `attack:17` | attack Nadu, Winged Wisdom | 57.7 [49.7, 65.3] (n 150) | - (n 0) |

**d13** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Show and Tell | 82.3 [75.4, 87.6] (n 150) | - (n 0) |
| 1 | `pass` | pass | 78.3 [71.1, 84.2] (n 150) | - (n 0) |
| 2 | `cast:18` | Upheaval | 43.0 [30.3, 56.7] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:15` | Stoneforge Mystic | 85.0 [78.4, 89.8] (n 150) | - (n 0) |

**d14** (turn 14, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:17` | attack Nadu, Winged Wisdom | 91.3 [85.7, 94.9] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 87.3 [81.1, 91.7] (n 150) | - (n 0) |

**d15** (turn 16, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 91.0 [79.9, 96.3] (n 50) | - (n 0) |
| 1 | `cast:18` | Upheaval | 63.0 [49.1, 75.0] (n 50) | - (n 0) |

**d16** (turn 16, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:2,9,17` | attack Nadu, Winged Wisdom+Hullbreaker Horror+Celestial Colonnade | 92.0 [86.5, 95.4] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 88.5 [80.8, 93.4] (n 100, stopped at 100) | - (n 0) |
| 2 | `attack:2,9` | attack Hullbreaker Horror+Celestial Colonnade | 93.7 [88.6, 96.6] (n 150) | - (n 0) |
| 3 | `attack:9,17` | attack Nadu, Winged Wisdom+Celestial Colonnade | 97.0 [92.9, 98.8] (n 150) | - (n 0) |
| 4 | `attack:2,17` | attack Nadu, Winged Wisdom+Hullbreaker Horror | 92.3 [86.9, 95.6] (n 150) | - (n 0) |

**d17** (turn 18, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 96.7 [92.4, 98.6] (n 150) | - (n 0) |
| 1 | `cast:18` | Upheaval | 77.0 [63.7, 86.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:12` | Overlord of the Balemurk | 94.0 [87.5, 97.2] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:12` | Overlord of the Balemurk | 98.3 [94.8, 99.5] (n 150) | - (n 0) |

**d18** (turn 18, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:2,9,17` | attack Nadu, Winged Wisdom+Hullbreaker Horror+Celestial Colonnade | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 2 | `attack:2,9` | attack Hullbreaker Horror+Celestial Colonnade | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:9,17` | attack Nadu, Winged Wisdom+Celestial Colonnade | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:2,17` | attack Nadu, Winged Wisdom+Hullbreaker Horror | 98.0 [83.4, 99.8] (n 25) | - (n 0) |

3875 branch games (0 with an error, left out); 270 random and 0 Forge branches ended at the turn cap.

## Checks

123628 rows checked (ids against each seat's own frame log), 7752 frame logs through tools/check-redaction.mjs, 3875 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 11). The guardrails read back from 7750 random seats' logs: a land offered at 38437 of 207880 priority decisions and taken at 38437; 0 of 0 opening hands kept; G3 left out a repeated no-op 1149 time(s); G5 (D458): the engine refused 716 pick(s) it could not pay for, and 592 later offer(s) of them in the same priority window were left out; G6 (D471): 901 pick(s) of the seats' own X plays had X drawn from 1 up, 15678 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

270 of 3875 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

