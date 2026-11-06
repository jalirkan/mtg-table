# Move atlas: pauper-3697-00001 vs pauper-3697-00002, seed 3797

D451. Seat A is pauper-3697-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 19 turns, won by B, and listed 20 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 2 | p | 3 | 0 `cast:7`, 0.0 [0.0, 19.0] (n 50) | -, - (n 0) | - | - |
| d1 | 4 | p | 3 | 2 `cast:28`, 3.0 [0.0, 13.0] (n 150) | 1 `cast:31`, 1.3 [0.0, 13.8] (n 40) | -1.00 [-1.00, 1.00] | no |
| d2 | 4 | p | 3 | 1 `pass`, 1.0 [0.0, 10.3] (n 150) | 1 `pass`, 5.0 [0.0, 22.5] (n 40) | 1.00 [-0.50, 1.00] | yes |
| d4 | 8 | p | 5 | 3 `cast:3`, 10.3 [2.3, 21.3] (n 150) | 4 `cast:30`, 11.3 [0.0, 26.3] (n 40) | 0.50 [-0.87, 1.00] | no |
| d6 | 8 | p | 5 | 0 `cast:3`, 0.0 [0.0, 5.0] (n 150) | 3 `cast:30`, 10.0 [0.0, 22.5] (n 40) | 0.60 [-0.74, 1.00] | no |
| d7 | 10 | p | 5 | 4 `cast:32`, 2.3 [0.0, 12.3] (n 150) | 1 `pass`, 20.0 [5.0, 35.0] (n 40) | 0.50 [-0.45, 0.90] | no |
| d8 | 10 | a | 2 | 1 `attack:3`, 9.3 [1.0, 18.7] (n 150) | 1 `attack:3`, 1.3 [0.0, 11.3] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d9 | 12 | p | 5 | 3 `cast:32`, 3.7 [0.0, 9.7] (n 150) | 0 `pass`, 0.0 [0.0, 7.5] (n 40) | 0.74 [-0.77, 0.95] | no |
| d10 | 12 | p | 5 | 4 `cast:25`, 0.3 [0.0, 5.7] (n 150) | 0 `cast:32`, 0.0 [0.0, 6.3] (n 40) | 0.00 [-0.90, 0.80] | no |
| d11 | 14 | p | 4 | 2 `cast:30`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d12 | 14 | p | 4 | 0 `cast:30`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d13 | 15 | b | 2 | 0 `block:30>77`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d14 | 16 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 16 | p | 2 | 0 `cast:36`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d16 | 17 | b | 2 | 0 `block:36>76`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d17 | 18 | p | 3 | 2 `cast:35`, 6.7 [1.7, 11.7] (n 150) | 0 `cast:40`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d18 | 18 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d19 | 18 | p | 2 | 1 `pass`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

18 decision(s) branched, 9 of them in full (1 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 8: d11 (mean value 1.0%, replaced by d7), d12 (mean value 0.0%, replaced by d13), d13 (mean value 4.0%, replaced by d14), d14 (mean value 0.0%, replaced by d15), d15 (mean value 0.0%, replaced by d16), d16 (mean value 0.0%, replaced by d18), d18 (mean value 4.0%, replaced by d19), d19 (mean value 2.0%, replaced by d8). Early stopping at 50/100 random branches stopped 5 option(s): d4 o1 at 50, d4 o2 at 50, d6 o4 at 50, d9 o1 at 100, d17 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 1 (d0), each a partial label at that n, never confident, saving at most 420 branch games; 2 it would have stopped played on to the full n as controls (d1, d7; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

Over 9 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.42 [-0.06, 0.77]; at 0 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 2 of 9 decision(s) (22.2% [6.3, 54.7]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d1 (turn 4, p): rank correlation -1.00 [-1.00, 1.00]; random's best `cast:28`, Forge's best `cast:31`.
- d10 (turn 12, p): rank correlation 0.00 [-0.90, 0.80]; random's best `cast:25`, Forge's best `cast:32`.
- d4 (turn 8, p): rank correlation 0.50 [-0.87, 1.00]; random's best `cast:3`, Forge's best `cast:30`.
- d7 (turn 10, p): rank correlation 0.50 [-0.45, 0.90]; random's best `cast:32`, Forge's best `pass`.
- d6 (turn 8, p): rank correlation 0.60 [-0.74, 1.00]; random's best `cast:3`, Forge's best `cast:30`.

### Each decision's options, side by side

**d0** (turn 2, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:7` | Tragic Slip | 63.0 [49.1, 75.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 60.0 [46.2, 72.4] (n 50) | - (n 0) |
| 2 | `cast:31` | Unwilling Ingredient | 55.0 [41.3, 67.9] (n 50) | - (n 0) |

**d1** (turn 4, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 60.7 [52.7, 68.1] (n 150) | 51.2 [36.3, 65.9] (n 40) |
| 1 | `cast:31` | Unwilling Ingredient | 59.7 [51.7, 67.2] (n 150) | 52.5 [37.5, 67.1] (n 40) |
| 2 | `cast:28` | Exhume | 63.7 [55.7, 70.9] (n 150) | 30.0 [18.1, 45.4] (n 40) |

**d2** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:31` | Unwilling Ingredient | 64.7 [56.7, 71.9] (n 150) | 38.8 [25.3, 54.2] (n 40) |
| 1 | `pass` | pass | 65.7 [57.8, 72.8] (n 150) | 43.8 [29.6, 59.0] (n 40) |
| 2 | `cast:28` | Exhume | 59.0 [51.0, 66.5] (n 150) | 28.7 [17.1, 44.1] (n 40) |

**d4** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 51.7 [43.7, 59.5] (n 150) | 32.5 [20.1, 48.0] (n 40) |
| 1 | `cast:36` | Frozen Shade | 44.0 [31.2, 57.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:28` | Exhume | 48.0 [34.8, 61.5] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:3` | Plaguecrafter | 62.0 [54.0, 69.4] (n 150) | 37.5 [24.2, 53.0] (n 40) |
| 4 | `cast:30` | Oroku Saki, Shredder Rising | 60.7 [52.7, 68.1] (n 150) | 43.8 [29.6, 59.0] (n 40) |

**d6** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Plaguecrafter | 65.0 [57.1, 72.2] (n 150) | 36.3 [23.2, 51.7] (n 40) |
| 1 | `pass` | pass | 51.3 [43.4, 59.2] (n 150) | 35.0 [22.1, 50.5] (n 40) |
| 2 | `cast:36` | Frozen Shade | 54.7 [46.7, 62.4] (n 150) | 26.3 [15.1, 41.5] (n 40) |
| 3 | `cast:30` | Oroku Saki, Shredder Rising | 61.0 [53.0, 68.4] (n 150) | 46.3 [31.8, 61.3] (n 40) |
| 4 | `cast:28` | Exhume | 40.0 [27.6, 53.8] (n 50, stopped at 50) | - (n 0) |

**d7** (turn 10, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:28` | Exhume | 36.0 [28.8, 43.9] (n 150) | 27.5 [16.1, 42.8] (n 40) |
| 1 | `pass` | pass | 34.3 [27.2, 42.2] (n 150) | 47.5 [32.9, 62.5] (n 40) |
| 2 | `cast:36` | Frozen Shade | 27.0 [20.5, 34.6] (n 150) | 25.0 [14.2, 40.2] (n 40) |
| 3 | `cast:30` | Oroku Saki, Shredder Rising | 32.7 [25.7, 40.5] (n 150) | 36.3 [23.2, 51.7] (n 40) |
| 4 | `cast:32` | Thorn of the Black Rose | 38.3 [30.9, 46.3] (n 150) | 42.5 [28.5, 57.8] (n 40) |

**d8** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 24.0 [17.9, 31.4] (n 150) | 38.8 [25.3, 54.2] (n 40) |
| 1 | `attack:3` | attack Plaguecrafter | 33.3 [26.3, 41.2] (n 150) | 40.0 [26.4, 55.4] (n 40) |

**d9** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 7.7 [4.4, 13.1] (n 150) | 17.5 [8.8, 31.9] (n 40) |
| 1 | `cast:36` | Frozen Shade | 4.5 [1.9, 10.5] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:30` | Oroku Saki, Shredder Rising | 5.0 [2.5, 9.8] (n 150) | 15.0 [7.1, 29.1] (n 40) |
| 3 | `cast:32` | Thorn of the Black Rose | 11.3 [7.2, 17.4] (n 150) | 17.5 [8.8, 31.9] (n 40) |
| 4 | `cast:25` | Pestilence | 6.0 [3.2, 11.0] (n 150) | 5.0 [1.4, 16.5] (n 40) |

**d10** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:32` | Thorn of the Black Rose | 6.0 [3.2, 11.0] (n 150) | 28.7 [17.1, 44.1] (n 40) |
| 1 | `pass` | pass | 4.3 [2.1, 8.9] (n 150) | 17.5 [8.8, 31.9] (n 40) |
| 2 | `cast:36` | Frozen Shade | 3.7 [1.6, 8.0] (n 150) | 15.0 [7.1, 29.1] (n 40) |
| 3 | `cast:30` | Oroku Saki, Shredder Rising | 4.7 [2.3, 9.3] (n 150) | 22.5 [12.3, 37.5] (n 40) |
| 4 | `cast:25` | Pestilence | 6.3 [3.4, 11.4] (n 150) | 5.0 [1.4, 16.5] (n 40) |

**d11** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 1.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:36` | Frozen Shade | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:30` | Oroku Saki, Shredder Rising | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 3 | `cast:25` | Pestilence | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d12** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:30` | Oroku Saki, Shredder Rising | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:36` | Frozen Shade | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `cast:25` | Pestilence | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d13** (turn 15, b; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:30>77` | block Oroku Saki, Shredder Rising>Al Bhed Salvagers | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d14** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:36` | Frozen Shade | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d15** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:36` | Frozen Shade | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d16** (turn 17, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:36>76` | block Frozen Shade>Voldaren Epicure | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d17** (turn 18, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:40` | Bone Shards | 2.0 [0.7, 5.7] (n 150) | 0.0 [0.0, 8.8] (n 40) |
| 1 | `pass` | pass | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:35` | Anchovy & Banana Pizza | 8.7 [5.1, 14.3] (n 150) | 0.0 [0.0, 8.8] (n 40) |

**d18** (turn 18, p; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 1 | `cast:35` | Anchovy & Banana Pizza | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d19** (turn 18, p; option 0 is Forge's answer) -- settled by the screen (mean value 2.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:35` | Anchovy & Banana Pizza | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

6840 branch games (0 with an error, left out); 206 random and 18 Forge branches ended at the turn cap.

## Checks

246029 rows checked (ids against each seat's own frame log), 13682 frame logs through tools/check-redaction.mjs, 6840 forks checked (0 not the position), 27 no-leak checks (0 moved; the negative control moved in 27). The guardrails read back from 11200 random seats' logs: a land offered at 50199 of 552842 priority decisions and taken at 50199; 0 of 0 opening hands kept; G3 left out a repeated no-op 1630 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 2194 pick(s) of the seats' own X plays had X drawn from 1 up, 7685 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

224 of 6840 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

