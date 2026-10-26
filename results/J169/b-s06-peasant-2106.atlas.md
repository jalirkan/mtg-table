# Move atlas: peasant-2006-00001 vs peasant-2006-00002, seed 2106

D451. Seat A is peasant-2006-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 22 turns, won by A, and listed 23 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 5 | p | 5 | 2 `cast:31`, 22.0 [15.0, 29.0] (n 200) | -, - (n 0) | - | - |
| d4 | 9 | p | 6 | 1 `cast:29`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d5 | 9 | p | 5 | 1 `pass`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d6 | 11 | p | 6 | 4 `cast:5`, 3.5 [1.0, 6.5] (n 200) | -, - (n 0) | - | - |
| d8 | 11 | p | 5 | 0 `cast:5`, 0.0 [0.0, 1.5] (n 200) | -, - (n 0) | - | - |
| d10 | 13 | p | 7 | 6 `cast:14`, 17.0 [10.0, 25.0] (n 200) | -, - (n 0) | - | - |
| d12 | 15 | p | 6 | 5 `cast:14`, 13.0 [4.5, 21.5] (n 200) | -, - (n 0) | - | - |
| d15 | 17 | p | 5 | 4 `cast:14`, 16.5 [9.5, 25.0] (n 200) | -, - (n 0) | - | - |
| d17 | 19 | p | 8 | 0 `cast:13`, 0.0 [0.0, 3.9] (n 200) | -, - (n 0) | - | - |
| d19 | 21 | p | 8 | 0 `cast:13`, 0.0 [0.0, 2.5] (n 200) | -, - (n 0) | - | - |
| d21 | 21 | a | 5 | 0 `attack:2,3,23`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 3: d4 (mean value 98.7%, replaced by d5), d21 (mean value 96.8%, replaced by d19), d5 (mean value 99.2%, replaced by d8). Early stopping at 50/100/150 random branches stopped 26 option(s): d2 o1 at 50, d2 o3 at 50, d2 o4 at 50, d6 o2 at 150, d6 o3 at 100, d6 o5 at 50, d10 o1 at 150, d10 o2 at 100, d10 o4 at 150, d10 o5 at 100, d12 o1 at 50, d12 o2 at 150, d12 o3 at 150, d12 o4 at 100, d15 o1 at 50, d15 o2 at 150, d17 o1 at 50, d17 o2 at 50, d17 o3 at 50, d17 o4 at 50, d17 o6 at 50, d17 o7 at 50, d8 o1 at 100, d8 o4 at 100, d19 o4 at 50, d19 o7 at 150 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:16#0` | Foreboding Landscape: {T}, Sacrifice CARDNAME: Search your l | 67.0 [60.2, 73.1] (n 200) | - (n 0) |
| 1 | `pass` | pass | 66.0 [52.1, 77.6] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:31` | Curse of Predation | 89.0 [83.9, 92.6] (n 200) | - (n 0) |
| 3 | `cast:14` | Loxodon Smiter | 80.0 [67.0, 88.8] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 72.0 [58.3, 82.5] (n 50, stopped at 50) | - (n 0) |

**d4** (turn 9, p; option 0 is Forge's answer) -- settled by the screen (mean value 98.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `cast:29` | Floral Spuzzem | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:1` | Honest Rutstein | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:14` | Loxodon Smiter | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `cast:5` | Kitchen Finks | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d5** (turn 9, p; option 0 is Forge's answer) -- settled by the screen (mean value 99.2%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:14` | Loxodon Smiter | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:5` | Kitchen Finks | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d6** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 96.0 [92.3, 98.0] (n 200) | - (n 0) |
| 1 | `cast:29` | Floral Spuzzem | 98.3 [95.3, 99.4] (n 200) | - (n 0) |
| 2 | `cast:1` | Honest Rutstein | 96.7 [92.4, 98.6] (n 150, stopped at 150) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 96.0 [90.2, 98.4] (n 100, stopped at 100) | - (n 0) |
| 4 | `cast:5` | Kitchen Finks | 99.5 [97.2, 99.9] (n 200) | - (n 0) |
| 5 | `cast:2` | Veteran Beastrider | 90.0 [78.6, 95.7] (n 50, stopped at 50) | - (n 0) |

**d8** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Kitchen Finks | 98.0 [95.0, 99.2] (n 200) | - (n 0) |
| 1 | `pass` | pass | 93.0 [86.3, 96.6] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 95.5 [91.7, 97.6] (n 200) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 96.0 [92.3, 98.0] (n 200) | - (n 0) |
| 4 | `cast:2` | Veteran Beastrider | 93.0 [86.3, 96.6] (n 100, stopped at 100) | - (n 0) |

**d10** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Angelic Voices | 48.0 [41.2, 54.9] (n 200) | - (n 0) |
| 1 | `pass` | pass | 47.3 [39.5, 55.3] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 47.0 [37.5, 56.7] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:1` | Honest Rutstein | 59.5 [52.6, 66.1] (n 200) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 50.7 [42.8, 58.6] (n 150, stopped at 150) | - (n 0) |
| 5 | `cast:2` | Veteran Beastrider | 46.0 [36.6, 55.7] (n 100, stopped at 100) | - (n 0) |
| 6 | `cast:14` | Loxodon Smiter | 65.0 [58.2, 71.3] (n 200) | - (n 0) |

**d12** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 60.5 [53.6, 67.0] (n 200) | - (n 0) |
| 1 | `cast:29` | Floral Spuzzem | 52.0 [38.5, 65.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:1` | Honest Rutstein | 64.0 [56.1, 71.2] (n 150, stopped at 150) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 64.0 [56.1, 71.2] (n 150, stopped at 150) | - (n 0) |
| 4 | `cast:2` | Veteran Beastrider | 59.0 [49.2, 68.1] (n 100, stopped at 100) | - (n 0) |
| 5 | `cast:14` | Loxodon Smiter | 73.5 [67.0, 79.1] (n 200) | - (n 0) |

**d15** (turn 17, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 65.0 [58.2, 71.3] (n 200) | - (n 0) |
| 1 | `cast:29` | Floral Spuzzem | 70.0 [56.3, 80.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:1` | Honest Rutstein | 70.7 [62.9, 77.4] (n 150, stopped at 150) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 76.0 [69.6, 81.4] (n 200) | - (n 0) |
| 4 | `cast:14` | Loxodon Smiter | 81.5 [75.5, 86.3] (n 200) | - (n 0) |

**d17** (turn 19, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Unburial Rites | 79.5 [73.4, 84.5] (n 200) | - (n 0) |
| 1 | `pass` | pass | 52.0 [38.5, 65.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 54.0 [40.4, 67.0] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:1` | Honest Rutstein | 66.0 [52.1, 77.6] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 62.0 [48.1, 74.1] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:14` | Loxodon Smiter | 74.5 [68.0, 80.0] (n 200) | - (n 0) |
| 6 | `cast:5` | Kitchen Finks | 68.0 [54.2, 79.2] (n 50, stopped at 50) | - (n 0) |
| 7 | `cast:21` | Land Tax | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |

**d19** (turn 21, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Unburial Rites | 98.5 [95.7, 99.5] (n 200) | - (n 0) |
| 1 | `pass` | pass | 97.0 [93.6, 98.6] (n 200) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 96.5 [93.0, 98.3] (n 200) | - (n 0) |
| 3 | `cast:1` | Honest Rutstein | 98.0 [95.0, 99.2] (n 200) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 78.0 [64.8, 87.3] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:14` | Loxodon Smiter | 98.5 [95.7, 99.5] (n 200) | - (n 0) |
| 6 | `cast:5` | Kitchen Finks | 98.0 [95.0, 99.2] (n 200) | - (n 0) |
| 7 | `cast:21` | Land Tax | 94.7 [89.8, 97.3] (n 150, stopped at 150) | - (n 0) |

**d21** (turn 21, a; option 0 is Forge's answer) -- settled by the screen (mean value 96.8%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:2,3,23` | attack Veteran Beastrider+Dauntless Scrapbot+Hero of the Dunes | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 84.0 [65.3, 93.6] (n 25) | - (n 0) |
| 2 | `attack:3,23` | attack Dauntless Scrapbot+Hero of the Dunes | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:2,23` | attack Veteran Beastrider+Hero of the Dunes | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:2,3` | attack Veteran Beastrider+Dauntless Scrapbot | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

7500 branch games (0 with an error, left out); 3 random and 0 Forge branches ended at the turn cap.

## Checks

213936 rows checked (ids against each seat's own frame log), 15002 frame logs through tools/check-redaction.mjs, 7500 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 11). The guardrails read back from 15000 random seats' logs: a land offered at 34864 of 501720 priority decisions and taken at 34864; 0 of 0 opening hands kept; G3 left out a repeated no-op 2533 time(s); G5 (D458): the engine refused 7 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 367 pick(s) of the seats' own X plays had X drawn from 1 up, 2271 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

3 of 7500 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

