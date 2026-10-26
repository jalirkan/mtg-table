# Move atlas: peasant-2006-00001 vs peasant-2006-00002, seed 2106

D451. Seat A is peasant-2006-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 22 turns, won by A, and listed 23 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 5 | p | 5 | 2 `cast:31`, 19.5 [14.0, 26.0] (n 200) | -, - (n 0) | - | - |
| d3 | 7 | p | 6 | 0 `cast:31`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |
| d4 | 9 | p | 6 | 1 `cast:29`, 2.0 [0.0, 6.0] (n 25) | -, - (n 0) | - | - |
| d5 | 9 | p | 5 | 1 `pass`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d6 | 11 | p | 6 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d8 | 11 | p | 5 | 0 `cast:5`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d10 | 13 | p | 7 | 6 `cast:14`, 20.5 [12.5, 28.0] (n 200) | -, - (n 0) | - | - |
| d12 | 15 | p | 6 | 3 `cast:11`, 3.5 [0.0, 11.5] (n 200) | -, - (n 0) | - | - |
| d14 | 15 | p | 6 | 5 `cast:14`, 12.0 [6.0, 18.0] (n 200) | -, - (n 0) | - | - |
| d15 | 17 | p | 5 | 4 `cast:14`, 10.0 [3.5, 16.0] (n 200) | -, - (n 0) | - | - |
| d16 | 17 | a | 4 | 0 `attack:2,5`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |
| d17 | 19 | p | 8 | 0 `cast:13`, 0.0 [0.0, 4.3] (n 200) | -, - (n 0) | - | - |
| d19 | 21 | p | 8 | 1 `pass`, 8.0 [0.0, 20.0] (n 25) | -, - (n 0) | - | - |
| d21 | 21 | a | 5 | 0 `attack:2,3,23`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

14 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 6: d4 (mean value 96.3%, replaced by d5), d6 (mean value 99.3%, replaced by d8), d21 (mean value 97.6%, replaced by d19), d5 (mean value 99.2%, replaced by d14), d8 (mean value 96.0%, replaced by d16), d19 (mean value 96.0%, replaced by d3). Early stopping at 50/100/150 random branches stopped 30 option(s): d2 o1 at 50, d2 o3 at 50, d2 o4 at 100, d10 o1 at 50, d10 o2 at 100, d10 o3 at 150, d10 o4 at 50, d10 o5 at 50, d12 o1 at 150, d12 o2 at 100, d12 o4 at 100, d17 o1 at 50, d17 o2 at 50, d17 o3 at 50, d17 o4 at 50, d17 o5 at 150, d17 o6 at 50, d17 o7 at 50, d14 o1 at 150, d14 o2 at 100, d14 o3 at 50, d14 o4 at 100, d16 o1 at 50, d16 o2 at 50, d16 o3 at 50, d3 o1 at 50, d3 o2 at 50, d3 o3 at 50, d3 o4 at 50, d3 o5 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:16#0` | Foreboding Landscape: {T}, Sacrifice CARDNAME: Search your l | 73.8 [67.3, 79.4] (n 200) | - (n 0) |
| 1 | `pass` | pass | 70.0 [56.3, 80.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:31` | Curse of Predation | 93.3 [88.9, 96.0] (n 200) | - (n 0) |
| 3 | `cast:14` | Loxodon Smiter | 78.0 [64.8, 87.3] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 82.0 [73.3, 88.3] (n 100, stopped at 100) | - (n 0) |

**d3** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:31` | Curse of Predation | 96.5 [93.0, 98.3] (n 200) | - (n 0) |
| 1 | `pass` | pass | 82.0 [69.2, 90.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 86.0 [73.8, 93.0] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:1` | Honest Rutstein | 66.0 [52.1, 77.6] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:14` | Loxodon Smiter | 74.0 [60.5, 84.1] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:11` | The Mountain-king's Return | 87.0 [79.0, 92.2] (n 100, stopped at 100) | - (n 0) |

**d4** (turn 9, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 98.0 [83.4, 99.8] (n 25) | - (n 0) |
| 1 | `cast:29` | Floral Spuzzem | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:1` | Honest Rutstein | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 3 | `cast:14` | Loxodon Smiter | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `cast:5` | Kitchen Finks | 92.0 [75.0, 97.8] (n 25) | - (n 0) |

**d5** (turn 9, p; option 0 is Forge's answer) -- settled by the screen (mean value 99.2%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:14` | Loxodon Smiter | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:5` | Kitchen Finks | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d6** (turn 11, p; option 0 is Forge's answer) -- settled by the screen (mean value 99.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:29` | Floral Spuzzem | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:1` | Honest Rutstein | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 4 | `cast:5` | Kitchen Finks | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `cast:2` | Veteran Beastrider | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d8** (turn 11, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Kitchen Finks | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 4 | `cast:2` | Veteran Beastrider | 92.0 [75.0, 97.8] (n 25) | - (n 0) |

**d10** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Angelic Voices | 61.0 [54.1, 67.5] (n 200) | - (n 0) |
| 1 | `pass` | pass | 68.0 [54.2, 79.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 70.0 [60.4, 78.1] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:1` | Honest Rutstein | 72.7 [65.0, 79.2] (n 150, stopped at 150) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:2` | Veteran Beastrider | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |
| 6 | `cast:14` | Loxodon Smiter | 81.5 [75.5, 86.3] (n 200) | - (n 0) |

**d12** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 75.0 [68.6, 80.5] (n 200) | - (n 0) |
| 1 | `cast:29` | Floral Spuzzem | 64.7 [56.7, 71.9] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:1` | Honest Rutstein | 65.0 [55.3, 73.6] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 78.5 [72.3, 83.6] (n 200) | - (n 0) |
| 4 | `cast:2` | Veteran Beastrider | 67.0 [57.3, 75.4] (n 100, stopped at 100) | - (n 0) |
| 5 | `cast:14` | Loxodon Smiter | 78.0 [71.8, 83.2] (n 200) | - (n 0) |

**d14** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:2` | Veteran Beastrider | 81.0 [75.0, 85.8] (n 200) | - (n 0) |
| 1 | `pass` | pass | 85.3 [78.8, 90.1] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 80.0 [71.1, 86.7] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:1` | Honest Rutstein | 78.0 [64.8, 87.3] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 85.0 [76.7, 90.7] (n 100, stopped at 100) | - (n 0) |
| 5 | `cast:14` | Loxodon Smiter | 93.0 [88.6, 95.8] (n 200) | - (n 0) |

**d15** (turn 17, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 76.5 [70.2, 81.8] (n 200) | - (n 0) |
| 1 | `cast:29` | Floral Spuzzem | 75.5 [69.1, 80.9] (n 200) | - (n 0) |
| 2 | `cast:1` | Honest Rutstein | 79.0 [72.8, 84.1] (n 200) | - (n 0) |
| 3 | `cast:11` | The Mountain-king's Return | 78.0 [71.8, 83.2] (n 200) | - (n 0) |
| 4 | `cast:14` | Loxodon Smiter | 86.5 [81.1, 90.5] (n 200) | - (n 0) |

**d16** (turn 17, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:2,5` | attack Veteran Beastrider+Kitchen Finks | 87.0 [81.6, 91.0] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 62.0 [48.1, 74.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:5` | attack Kitchen Finks | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:2` | attack Veteran Beastrider | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |

**d17** (turn 19, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Unburial Rites | 86.5 [81.1, 90.5] (n 200) | - (n 0) |
| 1 | `pass` | pass | 44.0 [31.2, 57.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 62.0 [48.1, 74.1] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:1` | Honest Rutstein | 72.0 [58.3, 82.5] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 72.0 [58.3, 82.5] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:14` | Loxodon Smiter | 79.3 [72.2, 85.0] (n 150, stopped at 150) | - (n 0) |
| 6 | `cast:5` | Kitchen Finks | 80.0 [67.0, 88.8] (n 50, stopped at 50) | - (n 0) |
| 7 | `cast:21` | Land Tax | 68.0 [54.2, 79.2] (n 50, stopped at 50) | - (n 0) |

**d19** (turn 21, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Unburial Rites | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:29` | Floral Spuzzem | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 3 | `cast:1` | Honest Rutstein | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:11` | The Mountain-king's Return | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 5 | `cast:14` | Loxodon Smiter | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 6 | `cast:5` | Kitchen Finks | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `cast:21` | Land Tax | 92.0 [75.0, 97.8] (n 25) | - (n 0) |

**d21** (turn 21, a; option 0 is Forge's answer) -- settled by the screen (mean value 97.6%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:2,3,23` | attack Veteran Beastrider+Dauntless Scrapbot+Hero of the Dunes | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 2 | `attack:3,23` | attack Dauntless Scrapbot+Hero of the Dunes | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:2,23` | attack Veteran Beastrider+Hero of the Dunes | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 4 | `attack:2,3` | attack Veteran Beastrider+Dauntless Scrapbot | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

6525 branch games (0 with an error, left out); 0 random and 0 Forge branches ended at the turn cap.

## Checks

180729 rows checked (ids against each seat's own frame log), 13052 frame logs through tools/check-redaction.mjs, 6525 forks checked (0 not the position), 14 no-leak checks (0 moved; the negative control moved in 14). The guardrails read back from 13050 random seats' logs: a land offered at 32652 of 348918 priority decisions and taken at 32652; 0 of 0 opening hands kept; G3 left out a repeated no-op 3604 time(s); G5 (D458): the engine refused 113 pick(s) it could not pay for, and 114 later offer(s) of them in the same priority window were left out; G6 (D471): 284 pick(s) of the seats' own X plays had X drawn from 1 up, 1160 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

