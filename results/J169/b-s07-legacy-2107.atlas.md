# Move atlas: legacy-2007-00001 vs legacy-2007-00002, seed 2107

D451. Seat A is legacy-2007-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 14 turns, won by A, and listed 16 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d4 | 6 | p | 6 | 0 `cast:10`, 0.0 [0.0, 3.5] (n 200) | 3 `activate:17`, 12.5 [2.5, 25.0] (n 40) | -0.87 [-1.00, 0.87] | no |
| d6 | 8 | p | 5 | 0 `cast:3`, 0.0 [0.0, 4.0] (n 200) | 0 `cast:3`, 0.0 [0.0, 5.0] (n 40) | 0.87 [-0.87, 1.00] | yes |
| d7 | 8 | a | 3 | 2 `attack:10,12`, 4.0 [0.5, 7.5] (n 200) | 2 `attack:10,12`, 2.5 [0.0, 10.0] (n 40) | 1.00 [1.00, 1.00] | yes |
| d8 | 10 | p | 5 | 2 `activate:17`, 5.0 [0.0, 10.0] (n 200) | 0 `cast:4`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d10 | 10 | a | 4 | 0 `attack:3,12`, 0.0 [0.0, 1.6] (n 200) | 0 `attack:3,12`, 0.0 [0.0, 2.5] (n 40) | 1.00 [0.50, 1.00] | yes |
| d11 | 12 | p | 4 | 3 `cast:8`, 2.0 [0.0, 7.0] (n 200) | 0 `pass`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d12 | 12 | a | 5 | 0 `attack:3,4,12`, 0.0 [0.0, 0.5] (n 200) | 0 `attack:3,4,12`, 0.0 [0.0, 0.0] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d13 | 12 | p | 4 | 0 `cast:8`, 0.0 [0.0, 0.0] (n 200) | 0 `cast:8`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d14 | 14 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 14 | a | 5 | 0 `attack:3,4,12`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

10 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 2: d14 (mean value 100.0%, replaced by d13), d15 (mean value 100.0%, replaced by d7). Early stopping at 50/100/150 random branches stopped 18 option(s): d4 o1 at 150, d4 o4 at 50, d4 o5 at 100, d6 o2 at 100, d6 o4 at 50, d8 o1 at 50, d8 o3 at 50, d8 o4 at 100, d10 o1 at 50, d11 o1 at 50, d11 o2 at 100, d12 o1 at 50, d12 o2 at 50, d12 o3 at 50, d13 o1 at 150, d13 o2 at 100, d13 o3 at 50, d7 o1 at 150 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

Over 8 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.60 [-0.15, 1.00]; at 2 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 5 of 8 decision(s) (62.5% [30.6, 86.3]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d4 (turn 6, p): rank correlation -0.87 [-1.00, 0.87]; random's best `cast:10`, Forge's best `activate:17`.
- d6 (turn 8, p): rank correlation 0.87 [-0.87, 1.00]; random's best `cast:3`, Forge's best `cast:3`.
- d7 (turn 8, a): rank correlation 1.00 [1.00, 1.00]; random's best `attack:10,12`, Forge's best `attack:10,12`.
- d10 (turn 10, a): rank correlation 1.00 [0.50, 1.00]; random's best `attack:3,12`, Forge's best `attack:3,12`.
- d12 (turn 12, a): rank correlation 1.00 [-1.00, 1.00]; random's best `attack:3,4,12`, Forge's best `attack:3,4,12`.

### Each decision's options, side by side

**d4** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:10` | Ydwen Efreet | 87.0 [81.6, 91.0] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 1 | `pass` | pass | 79.3 [72.2, 85.0] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:3` | Sedge Troll | 85.5 [80.0, 89.7] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 3 | `activate:17` | Cori-Steel Cutter: Equip {1}{R} ({1}{R}: Attach to target cr | 82.5 [76.6, 87.1] (n 200) | 90.0 [77.0, 96.0] (n 40) |
| 4 | `cast:22` | Sweltering Suns | 60.0 [46.2, 72.4] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:39` | Disrupting Scepter | 65.0 [55.3, 73.6] (n 100, stopped at 100) | - (n 0) |

**d6** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Sedge Troll | 89.0 [83.9, 92.6] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 1 | `pass` | pass | 86.5 [81.1, 90.5] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 2 | `cast:22` | Sweltering Suns | 74.0 [64.6, 81.6] (n 100, stopped at 100) | - (n 0) |
| 3 | `activate:17` | Cori-Steel Cutter: Equip {1}{R} ({1}{R}: Attach to target cr | 85.0 [79.4, 89.3] (n 200) | 72.5 [57.2, 83.9] (n 40) |
| 4 | `cast:39` | Disrupting Scepter | 70.0 [56.3, 80.9] (n 50, stopped at 50) | - (n 0) |

**d7** (turn 8, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:10` | attack Ydwen Efreet | 88.0 [82.8, 91.8] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 1 | `attack:none` | attack none | 84.0 [77.3, 89.0] (n 150, stopped at 150) | - (n 0) |
| 2 | `attack:10,12` | attack Ydwen Efreet+Fervent Champion | 92.0 [87.4, 95.0] (n 200) | 80.0 [65.2, 89.5] (n 40) |

**d8** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Stadium Headliner | 90.0 [85.1, 93.4] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 86.0 [73.8, 93.0] (n 50, stopped at 50) | - (n 0) |
| 2 | `activate:17` | Cori-Steel Cutter: Equip {1}{R} ({1}{R}: Attach to target cr | 95.0 [91.0, 97.3] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 3 | `cast:22` | Sweltering Suns | 74.0 [60.5, 84.1] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:39` | Disrupting Scepter | 83.0 [74.5, 89.1] (n 100, stopped at 100) | - (n 0) |

**d10** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,12` | attack Sedge Troll+Fervent Champion | 95.5 [91.7, 97.6] (n 200) | 80.0 [65.2, 89.5] (n 40) |
| 1 | `attack:none` | attack none | 88.0 [76.2, 94.4] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:12` | attack Fervent Champion | 91.0 [86.2, 94.2] (n 200) | 57.5 [42.2, 71.5] (n 40) |
| 3 | `attack:3` | attack Sedge Troll | 93.5 [89.2, 96.2] (n 200) | 70.0 [54.6, 81.9] (n 40) |

**d11** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 92.0 [87.4, 95.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `cast:22` | Sweltering Suns | 56.0 [42.3, 68.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:39` | Disrupting Scepter | 86.0 [77.9, 91.5] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:8` | Manabarbs | 94.0 [89.8, 96.5] (n 200) | 100.0 [91.2, 100.0] (n 40) |

**d12** (turn 12, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,4,12` | attack Sedge Troll+Stadium Headliner+Fervent Champion | 99.0 [96.4, 99.7] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `attack:none` | attack none | 82.0 [69.2, 90.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:4,12` | attack Stadium Headliner+Fervent Champion | 86.0 [73.8, 93.0] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:3,12` | attack Sedge Troll+Fervent Champion | 88.0 [76.2, 94.4] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:3,4` | attack Sedge Troll+Stadium Headliner | 97.5 [94.3, 98.9] (n 200) | 92.5 [80.1, 97.4] (n 40) |

**d13** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:8` | Manabarbs | 100.0 [98.1, 100.0] (n 200) | 97.5 [87.1, 99.6] (n 40) |
| 1 | `pass` | pass | 97.3 [93.3, 99.0] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:39` | Disrupting Scepter | 95.0 [88.8, 97.9] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:22` | Sweltering Suns | 90.0 [78.6, 95.7] (n 50, stopped at 50) | - (n 0) |

**d14** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:22` | Sweltering Suns | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:39` | Disrupting Scepter | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d15** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,4,12` | attack Sedge Troll+Stadium Headliner+Fervent Champion | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:4,12` | attack Stadium Headliner+Fervent Champion | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:3,12` | attack Sedge Troll+Fervent Champion | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:3,4` | attack Sedge Troll+Stadium Headliner | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

5970 branch games (0 with an error, left out); 0 random and 0 Forge branches ended at the turn cap.

## Checks

93370 rows checked (ids against each seat's own frame log), 11942 frame logs through tools/check-redaction.mjs, 5970 forks checked (0 not the position), 18 no-leak checks (0 moved; the negative control moved in 18). The guardrails read back from 10500 random seats' logs: a land offered at 26694 of 211007 priority decisions and taken at 26694; 0 of 0 opening hands kept; G3 left out a repeated no-op 253 time(s); G5 (D458): the engine refused 3 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 1197 pick(s) of the seats' own X plays had X drawn from 1 up, 66741 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

