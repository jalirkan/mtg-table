# Move atlas: legacy-2007-00001 vs legacy-2007-00002, seed 2107

D451. Seat A is legacy-2007-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 14 turns, won by A, and listed 16 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d3 | 4 | a | 2 | 0 `attack:12`, 0.0 [0.0, 2.9] (n 200) | 0 `attack:12`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d4 | 6 | p | 6 | 0 `cast:10`, 0.0 [0.0, 0.0] (n 200) | 0 `cast:10`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d5 | 6 | a | 2 | 0 `attack:none`, 0.0 [0.0, 0.0] (n 200) | 0 `attack:none`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d6 | 8 | p | 5 | 0 `cast:3`, 0.0 [0.0, 1.5] (n 200) | 0 `cast:3`, 0.0 [0.0, 5.0] (n 40) | 0.50 [-0.87, 0.87] | yes |
| d7 | 8 | a | 3 | 0 `attack:10`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d8 | 10 | p | 5 | 2 `activate:17`, 0.5 [0.0, 8.0] (n 200) | 0 `cast:4`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d9 | 10 | p | 2 | 0 `activate:17`, 0.0 [0.0, 0.0] (n 200) | 0 `activate:17`, 0.0 [0.0, 0.0] (n 40) | 1.00 [1.00, 1.00] | yes |
| d10 | 10 | a | 4 | 0 `attack:3,12`, 0.0 [0.0, 1.3] (n 200) | 0 `attack:3,12`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d11 | 12 | p | 4 | 3 `cast:8`, 11.5 [5.0, 18.0] (n 200) | 0 `pass`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d12 | 12 | a | 5 | 0 `attack:3,4,12`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d13 | 12 | p | 4 | 0 `cast:8`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d14 | 14 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 14 | a | 5 | 0 `attack:3,4,12`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

13 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 5: d12 (mean value 96.0%, replaced by d13), d14 (mean value 100.0%, replaced by d5), d15 (mean value 100.0%, replaced by d3), d13 (mean value 96.0%, replaced by d7), d7 (mean value 98.7%, replaced by d9). Early stopping at 50/100/150 random branches stopped 16 option(s): d4 o1 at 150, d4 o3 at 50, d4 o4 at 50, d4 o5 at 50, d6 o2 at 150, d6 o4 at 100, d8 o1 at 50, d8 o3 at 50, d8 o4 at 50, d10 o1 at 50, d10 o2 at 100, d10 o3 at 100, d11 o1 at 50, d11 o2 at 100, d5 o1 at 50, d3 o1 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

Over 8 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.75 [0.50, 1.00]; at 1 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 6 of 8 decision(s) (75.0% [40.9, 92.8]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d6 (turn 8, p): rank correlation 0.50 [-0.87, 0.87]; random's best `cast:3`, Forge's best `cast:3`.
- d9 (turn 10, p): rank correlation 1.00 [1.00, 1.00]; random's best `activate:17`, Forge's best `activate:17`.
- d8 (turn 10, p): rank correlation -; random's best `activate:17`, Forge's best `cast:4`.
- d11 (turn 12, p): rank correlation -; random's best `cast:8`, Forge's best `pass`.
- d3 (turn 4, a): rank correlation -; random's best `attack:12`, Forge's best `attack:12`.

### Each decision's options, side by side

**d3** (turn 4, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:12` | attack Fervent Champion | 69.5 [62.8, 75.5] (n 200) | 67.5 [52.0, 79.9] (n 40) |
| 1 | `attack:none` | attack none | 64.5 [54.7, 73.2] (n 100, stopped at 100) | - (n 0) |

**d4** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:10` | Ydwen Efreet | 91.0 [86.2, 94.2] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 1 | `pass` | pass | 81.3 [74.3, 86.8] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:3` | Sedge Troll | 83.8 [78.0, 88.2] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 3 | `activate:17` | Cori-Steel Cutter: Equip {1}{R} ({1}{R}: Attach to target cr | 69.0 [55.2, 80.1] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:22` | Sweltering Suns | 60.0 [46.2, 72.4] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:39` | Disrupting Scepter | 54.0 [40.4, 67.0] (n 50, stopped at 50) | - (n 0) |

**d5** (turn 6, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 92.5 [88.0, 95.4] (n 200) | 85.0 [70.9, 92.9] (n 40) |
| 1 | `attack:12` | attack Fervent Champion | 80.0 [67.0, 88.8] (n 50, stopped at 50) | - (n 0) |

**d6** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Sedge Troll | 95.5 [91.7, 97.6] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 1 | `pass` | pass | 92.0 [87.4, 95.0] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 2 | `cast:22` | Sweltering Suns | 86.7 [80.3, 91.2] (n 150, stopped at 150) | - (n 0) |
| 3 | `activate:17` | Cori-Steel Cutter: Equip {1}{R} ({1}{R}: Attach to target cr | 92.0 [87.4, 95.0] (n 200) | 72.5 [57.2, 83.9] (n 40) |
| 4 | `cast:39` | Disrupting Scepter | 83.0 [74.5, 89.1] (n 100, stopped at 100) | - (n 0) |

**d7** (turn 8, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:10` | attack Ydwen Efreet | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `attack:10,12` | attack Ydwen Efreet+Fervent Champion | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d8** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Stadium Headliner | 85.5 [80.0, 89.7] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 82.0 [69.2, 90.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `activate:17` | Cori-Steel Cutter: Equip {1}{R} ({1}{R}: Attach to target cr | 86.0 [80.5, 90.1] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 3 | `cast:22` | Sweltering Suns | 70.0 [56.3, 80.9] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:39` | Disrupting Scepter | 76.0 [62.6, 85.7] (n 50, stopped at 50) | - (n 0) |

**d9** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:17` | Cori-Steel Cutter: Equip {1}{R} ({1}{R}: Attach to target cr | 85.0 [79.4, 89.3] (n 200) | 65.0 [49.5, 77.9] (n 40) |
| 1 | `pass` | pass | 77.0 [70.7, 82.3] (n 200) | 50.0 [35.2, 64.8] (n 40) |

**d10** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,12` | attack Sedge Troll+Fervent Champion | 89.3 [84.2, 92.8] (n 200) | 80.0 [65.2, 89.5] (n 40) |
| 1 | `attack:none` | attack none | 76.0 [62.6, 85.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:12` | attack Fervent Champion | 80.0 [71.1, 86.7] (n 100, stopped at 100) | - (n 0) |
| 3 | `attack:3` | attack Sedge Troll | 85.0 [76.7, 90.7] (n 100, stopped at 100) | - (n 0) |

**d11** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 80.5 [74.5, 85.4] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `cast:22` | Sweltering Suns | 74.0 [60.5, 84.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:39` | Disrupting Scepter | 82.0 [73.3, 88.3] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:8` | Manabarbs | 92.0 [87.4, 95.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |

**d12** (turn 12, a; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,4,12` | attack Sedge Troll+Stadium Headliner+Fervent Champion | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 80.0 [60.9, 91.1] (n 25) | - (n 0) |
| 2 | `attack:4,12` | attack Stadium Headliner+Fervent Champion | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:3,12` | attack Sedge Troll+Fervent Champion | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:3,4` | attack Sedge Troll+Stadium Headliner | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d13** (turn 12, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:8` | Manabarbs | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 2 | `cast:39` | Disrupting Scepter | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:22` | Sweltering Suns | 92.0 [75.0, 97.8] (n 25) | - (n 0) |

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

5110 branch games (0 with an error, left out); 4 random and 0 Forge branches ended at the turn cap.

## Checks

99849 rows checked (ids against each seat's own frame log), 10222 frame logs through tools/check-redaction.mjs, 5110 forks checked (0 not the position), 21 no-leak checks (0 moved; the negative control moved in 21). The guardrails read back from 9100 random seats' logs: a land offered at 27720 of 170256 priority decisions and taken at 27720; 0 of 0 opening hands kept; G3 left out a repeated no-op 730 time(s); G5 (D458): the engine refused 57 pick(s) it could not pay for, and 6 later offer(s) of them in the same priority window were left out; G6 (D471): 1151 pick(s) of the seats' own X plays had X drawn from 1 up, 69322 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

4 of 5110 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

