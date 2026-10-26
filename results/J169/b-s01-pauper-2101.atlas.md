# Move atlas: pauper-2001-00001 vs pauper-2001-00002, seed 2101

D451. Seat A is pauper-2001-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 32 turns, won by A, and listed 23 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d3 | 8 | p | 3 | 1 `pass`, 2.0 [0.0, 10.8] (n 200) | 1 `pass`, 6.3 [0.0, 20.0] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d6 | 10 | p | 4 | 2 `cast:1`, 3.5 [0.0, 11.0] (n 200) | 0 `pass`, 0.0 [0.0, 12.5] (n 40) | -0.33 [-1.00, 1.00] | no |
| d7 | 10 | p | 5 | 2 `cast:18`, 5.3 [0.3, 13.3] (n 200) | 0 `cast:1`, 0.0 [0.0, 15.0] (n 40) | -1.00 [-1.00, 1.00] | no |
| d9 | 14 | p | 4 | 3 `cast:17`, 5.0 [0.0, 13.3] (n 200) | 3 `cast:17`, 33.8 [21.3, 51.2] (n 40) | 0.80 [-0.50, 1.00] | yes |
| d11 | 16 | p | 3 | 0 `cast:17`, 0.0 [0.0, 6.8] (n 200) | 2 `cast:2`, 2.5 [0.0, 17.5] (n 40) | - [-1.00, 1.00] | no |
| d14 | 28 | p | 3 | 2 `cast:21`, 2.8 [0.0, 8.5] (n 200) | 0 `cast:16`, 0.0 [0.0, 2.5] (n 40) | 0.50 [-1.00, 1.00] | no |
| d15 | 28 | p | 3 | 0 `cast:21`, 0.0 [0.0, 3.8] (n 200) | 0 `cast:21`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d16 | 28 | p | 3 | 0 `cast:26`, 0.0 [0.0, 0.0] (n 200) | 0 `cast:26`, 0.0 [0.0, 0.0] (n 40) | - | yes |

### The cut design (D480)

8 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100/150 random branches stopped 6 option(s): d3 o2 at 50, d7 o1 at 150, d11 o1 at 100, d15 o1 at 100, d16 o1 at 50, d16 o2 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

Over 8 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.19 [-0.47, 0.80]; at 0 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 4 of 8 decision(s) (50.0% [21.5, 78.5]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d7 (turn 10, p): rank correlation -1.00 [-1.00, 1.00]; random's best `cast:18`, Forge's best `cast:1`.
- d6 (turn 10, p): rank correlation -0.33 [-1.00, 1.00]; random's best `cast:1`, Forge's best `pass`.
- d14 (turn 28, p): rank correlation 0.50 [-1.00, 1.00]; random's best `cast:21`, Forge's best `cast:16`.
- d9 (turn 14, p): rank correlation 0.80 [-0.50, 1.00]; random's best `cast:17`, Forge's best `cast:17`.
- d3 (turn 8, p): rank correlation 1.00 [-1.00, 1.00]; random's best `pass`, Forge's best `pass`.

### Each decision's options, side by side

**d3** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Wrenn's Resolve | 56.5 [49.6, 63.2] (n 200) | 43.8 [29.6, 59.0] (n 40) |
| 1 | `pass` | pass | 58.5 [51.6, 65.1] (n 200) | 50.0 [35.2, 64.8] (n 40) |
| 2 | `cast:24` | Mintstrosity | 53.0 [39.5, 66.1] (n 50, stopped at 50) | - (n 0) |

**d6** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 67.0 [60.2, 73.1] (n 200) | 65.0 [49.5, 77.9] (n 40) |
| 1 | `cast:18` | Flayer Husk | 67.8 [61.0, 73.8] (n 200) | 57.5 [42.2, 71.5] (n 40) |
| 2 | `cast:1` | Mindstab Thrull | 70.5 [63.8, 76.4] (n 200) | 62.5 [47.0, 75.8] (n 40) |
| 3 | `cast:1` | Mindstab Thrull | 70.5 [63.8, 76.4] (n 200) | 62.5 [47.0, 75.8] (n 40) |

**d7** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Mindstab Thrull | 66.8 [60.0, 72.9] (n 200) | 66.3 [50.8, 78.9] (n 40) |
| 1 | `pass` | pass | 64.3 [56.4, 71.5] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:18` | Flayer Husk | 72.0 [65.4, 77.8] (n 200) | 62.5 [47.0, 75.8] (n 40) |
| 3 | `cast:1` | Mindstab Thrull | 66.8 [60.0, 72.9] (n 200) | 66.3 [50.8, 78.9] (n 40) |
| 4 | `cast:29` | Stone Rain | 71.8 [65.1, 77.5] (n 200) | 65.0 [49.5, 77.9] (n 40) |

**d9** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Pyrotechnics | 36.5 [30.1, 43.4] (n 200) | 28.7 [17.1, 44.1] (n 40) |
| 1 | `pass` | pass | 39.0 [32.5, 45.9] (n 200) | 27.5 [16.1, 42.8] (n 40) |
| 2 | `cast:2` | Path to the World Tree | 41.3 [34.6, 48.2] (n 200) | 58.8 [43.4, 72.6] (n 40) |
| 3 | `cast:17` | Ashnod's Altar | 41.5 [34.9, 48.4] (n 200) | 62.5 [47.0, 75.8] (n 40) |

**d11** (turn 16, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Ashnod's Altar | 36.0 [29.7, 42.9] (n 200) | 32.5 [20.1, 48.0] (n 40) |
| 1 | `pass` | pass | 30.5 [22.3, 40.1] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:2` | Path to the World Tree | 36.0 [29.7, 42.9] (n 200) | 35.0 [22.1, 50.5] (n 40) |

**d14** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:16` | Faerie Guidemother | 40.0 [33.5, 46.9] (n 200) | 82.5 [68.0, 91.3] (n 40) |
| 1 | `pass` | pass | 39.3 [32.8, 46.2] (n 200) | 71.3 [55.9, 82.9] (n 40) |
| 2 | `cast:21` | Regrowth | 42.8 [36.1, 49.7] (n 200) | 80.0 [65.2, 89.5] (n 40) |

**d15** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Regrowth | 46.0 [39.2, 52.9] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 38.0 [29.1, 47.8] (n 100, stopped at 100) | - (n 0) |
| 2 | `activate:18` | Flayer Husk: Equip {2} ({2}: Attach to target creature you c | 43.8 [37.1, 50.7] (n 200) | 87.5 [73.9, 94.5] (n 40) |

**d16** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:26` | Troll of Khazad-dûm | 67.3 [60.5, 73.4] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 44.0 [31.2, 57.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `activate:18` | Flayer Husk: Equip {2} ({2}: Attach to target creature you c | 48.0 [34.8, 61.5] (n 50, stopped at 50) | - (n 0) |

5780 branch games (0 with an error, left out); 1201 random and 16 Forge branches ended at the turn cap.

## Checks

213428 rows checked (ids against each seat's own frame log), 11562 frame logs through tools/check-redaction.mjs, 5780 forks checked (0 not the position), 16 no-leak checks (0 moved; the negative control moved in 16). The guardrails read back from 9800 random seats' logs: a land offered at 44710 of 565964 priority decisions and taken at 44710; 0 of 0 opening hands kept; G3 left out a repeated no-op 0 time(s); G5 (D458): the engine refused 82 pick(s) it could not pay for, and 36 later offer(s) of them in the same priority window were left out; G6 (D471): 2891 pick(s) of the seats' own X plays had X drawn from 1 up, 16336 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem. Warnings (never a problem): 9, below.

### Branch games the turn cap ended

1217 of 5780 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

- a warning: d3 option 1 `pass` (pass): 64 of 240 branch game(s) were capped (random 62 of 200, forge 2 of 40): 64 x ended at the turn cap
- a warning: d14 option 0 `cast:16` (Faerie Guidemother): 84 of 240 branch game(s) were capped (random 84 of 200, forge 0 of 40): 84 x ended at the turn cap
- a warning: d14 option 1 `pass` (pass): 89 of 240 branch game(s) were capped (random 88 of 200, forge 1 of 40): 89 x ended at the turn cap
- a warning: d14 option 2 `cast:21` (Regrowth): 71 of 240 branch game(s) were capped (random 71 of 200, forge 0 of 40): 71 x ended at the turn cap
- a warning: d15 option 0 `cast:21` (Regrowth): 71 of 240 branch game(s) were capped (random 71 of 200, forge 0 of 40): 71 x ended at the turn cap
- a warning: d15 option 1 `pass` (pass): 48 of 100 branch game(s) were capped (random 48 of 100): 48 x ended at the turn cap
- a warning: d15 option 2 `activate:18` (Flayer Husk: Equip {2} ({2}: Attach to target creature you c): 76 of 240 branch game(s) were capped (random 76 of 200, forge 0 of 40): 76 x ended at the turn cap
- a warning: d16 option 1 `pass` (pass): 26 of 50 branch game(s) were capped (random 26 of 50): 26 x ended at the turn cap
- a warning: d16 option 2 `activate:18` (Flayer Husk: Equip {2} ({2}: Attach to target creature you c): 22 of 50 branch game(s) were capped (random 22 of 50): 22 x ended at the turn cap

