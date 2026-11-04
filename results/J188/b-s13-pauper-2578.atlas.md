# Move atlas: pauper-2478-00001 vs pauper-2478-00002, seed 2578

D451. Seat A is pauper-2478-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 14 turns, won by B, and listed 11 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 3 | p | 3 | 0 `activate:39#0`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d1 | 5 | p | 2 | 1 `cast:12`, 2.0 [0.0, 11.0] (n 150) | 1 `cast:12`, 2.5 [0.0, 10.0] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d2 | 5 | p | 2 | 1 `pass`, 2.3 [0.0, 10.0] (n 150) | 0 `cast:12`, 0.0 [0.0, 11.3] (n 40) | -1.00 [-1.00, 1.00] | no |
| d3 | 7 | p | 3 | 0 `activate:27#0`, 0.0 [0.0, 7.0] (n 50) | -, - (n 0) | - | - |
| d4 | 7 | p | 3 | 2 `cast:22`, 1.0 [0.0, 10.0] (n 150) | 1 `pass`, 2.5 [0.0, 7.5] (n 40) | -1.00 [-1.00, 0.87] | no |
| d5 | 9 | p | 2 | 0 `pass`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d6 | 9 | p | 2 | 1 `pass`, 10.7 [2.3, 18.7] (n 150) | 1 `pass`, 2.5 [0.0, 10.0] (n 40) | 1.00 [1.00, 1.00] | yes |
| d7 | 11 | p | 3 | 0 `cast:29`, 0.0 [0.0, 7.3] (n 150) | 0 `cast:29`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d8 | 13 | p | 2 | 0 `pass`, 0.0 [0.0, 2.0] (n 50) | -, - (n 0) | - | - |
| d9 | 13 | p | 2 | 0 `cast:3`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d10 | 14 | b | 2 | 0 `block:3>105`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 5 of them in full (4 more stopped by the futility rule, D489); picked among those with 3 or more options first (6 filled from the rest). The screen at 25 random branches settled 2: d9 (mean value 0.0%, nothing left to replace it), d10 (mean value 0.0%, replaced by d6). Early stopping at 50/100 random branches stopped 0 option(s): none (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 9 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 4 (d0, d3, d5, d8), each a partial label at that n, never confident, saving at most 1400 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

Over 5 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.00 [-1.00, 1.00]; at 1 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 3 of 5 decision(s) (60.0% [23.1, 88.2]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d2 (turn 5, p): rank correlation -1.00 [-1.00, 1.00]; random's best `pass`, Forge's best `cast:12`.
- d4 (turn 7, p): rank correlation -1.00 [-1.00, 0.87]; random's best `cast:22`, Forge's best `pass`.
- d1 (turn 5, p): rank correlation 1.00 [-1.00, 1.00]; random's best `cast:12`, Forge's best `cast:12`.
- d6 (turn 9, p): rank correlation 1.00 [1.00, 1.00]; random's best `pass`, Forge's best `pass`.
- d7 (turn 11, p): rank correlation -; random's best `cast:29`, Forge's best `cast:29`.

### Each decision's options, side by side

**d0** (turn 3, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:39#0` | Tranquil Landscape: {T}, Sacrifice CARDNAME: Search your lib | 50.0 [36.6, 63.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 37.0 [25.0, 50.9] (n 50) | - (n 0) |
| 2 | `cast:12` | Ichor Wellspring | 49.0 [35.7, 62.4] (n 50) | - (n 0) |

**d1** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 42.0 [34.4, 50.0] (n 150) | 21.3 [11.4, 36.1] (n 40) |
| 1 | `cast:12` | Ichor Wellspring | 44.0 [36.3, 52.0] (n 150) | 23.8 [13.3, 38.9] (n 40) |

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:12` | Ichor Wellspring | 36.7 [29.4, 44.6] (n 150) | 22.5 [12.3, 37.5] (n 40) |
| 1 | `pass` | pass | 39.0 [31.6, 47.0] (n 150) | 21.3 [11.4, 36.1] (n 40) |

**d3** (turn 7, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:27#0` | Bountiful Landscape: {T}, Sacrifice CARDNAME: Search your li | 25.0 [15.1, 38.5] (n 50) | - (n 0) |
| 1 | `pass` | pass | 20.0 [11.2, 33.0] (n 50) | - (n 0) |
| 2 | `cast:22` | Blood Fountain | 17.0 [9.0, 29.7] (n 50) | - (n 0) |

**d4** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Disfigure | 36.7 [29.4, 44.6] (n 150) | 5.0 [1.4, 16.5] (n 40) |
| 1 | `pass` | pass | 33.7 [26.6, 41.5] (n 150) | 7.5 [2.6, 19.9] (n 40) |
| 2 | `cast:22` | Blood Fountain | 37.7 [30.3, 45.6] (n 150) | 2.5 [0.4, 12.9] (n 40) |

**d5** (turn 9, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 40.0 [27.6, 53.8] (n 50) | - (n 0) |
| 1 | `cast:22` | Blood Fountain | 37.0 [25.0, 50.9] (n 50) | - (n 0) |

**d6** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:22` | Blood Fountain | 27.0 [20.5, 34.6] (n 150) | 5.0 [1.4, 16.5] (n 40) |
| 1 | `pass` | pass | 37.7 [30.3, 45.6] (n 150) | 7.5 [2.6, 19.9] (n 40) |

**d7** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:29` | Desert Twister | 14.3 [9.6, 20.8] (n 150) | 0.0 [0.0, 8.8] (n 40) |
| 1 | `pass` | pass | 14.3 [9.6, 20.8] (n 150) | 0.0 [0.0, 8.8] (n 40) |
| 2 | `cast:3` | Mindstab Thrull | 13.3 [8.8, 19.7] (n 150) | 0.0 [0.0, 8.8] (n 40) |

**d8** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 12.0 [5.6, 23.8] (n 50) | - (n 0) |
| 1 | `cast:3` | Mindstab Thrull | 4.0 [1.1, 13.5] (n 50) | - (n 0) |

**d9** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Mindstab Thrull | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d10** (turn 14, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:3>105` | block Mindstab Thrull>Goblin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

2880 branch games (0 with an error, left out); 398 random and 7 Forge branches ended at the turn cap.

## Checks

138611 rows checked (ids against each seat's own frame log), 5762 frame logs through tools/check-redaction.mjs, 2880 forks checked (0 not the position), 16 no-leak checks (0 moved; the negative control moved in 16). The guardrails read back from 4800 random seats' logs: a land offered at 26541 of 357551 priority decisions and taken at 26541; 0 of 0 opening hands kept; G3 left out a repeated no-op 880 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 960 pick(s) of the seats' own X plays had X drawn from 1 up, 1769 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem. Warnings (never a problem): 3, below.

### Branch games the turn cap ended

405 of 2880 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

- a warning: d0 option 0 `activate:39#0` (Tranquil Landscape: {T}, Sacrifice CARDNAME: Search your lib): 16 of 50 branch game(s) were capped (random 16 of 50): 16 x ended at the turn cap
- a warning: d0 option 1 `pass` (pass): 13 of 50 branch game(s) were capped (random 13 of 50): 13 x ended at the turn cap
- a warning: d2 option 1 `pass` (pass): 50 of 190 branch game(s) were capped (random 47 of 150, forge 3 of 40): 50 x ended at the turn cap

