# Move atlas: pauper-2001-00001 vs pauper-2001-00002, seed 2101

D451. Seat A is pauper-2001-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 32 turns, won by A, and listed 23 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d3 | 8 | p | 3 | 0 `cast:6`, 0.0 [0.0, 4.0] (n 200) | 2 `cast:24`, 8.8 [0.0, 25.0] (n 40) | -1.00 [-1.00, 1.00] | no |
| d6 | 10 | p | 3 | 0 `pass`, 0.0 [0.0, 5.8] (n 200) | 0 `pass`, 0.0 [0.0, 12.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d7 | 10 | p | 4 | 3 `cast:29`, 2.0 [0.0, 9.5] (n 200) | 0 `cast:1`, 0.0 [0.0, 15.0] (n 40) | 0.00 [-1.00, 1.00] | no |
| d9 | 14 | p | 4 | 1 `pass`, 5.8 [0.5, 12.5] (n 200) | 3 `cast:17`, 33.8 [21.3, 51.2] (n 40) | -0.40 [-0.95, 0.80] | no |
| d11 | 16 | p | 3 | 1 `pass`, 3.3 [0.0, 9.0] (n 200) | 1 `pass`, 6.3 [0.0, 23.8] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d14 | 28 | p | 3 | 0 `cast:16`, 0.0 [0.0, 2.3] (n 200) | 0 `cast:16`, 0.0 [0.0, 2.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d15 | 28 | p | 3 | 2 `activate:18`, 2.5 [0.0, 7.2] (n 200) | 0 `cast:21`, 0.0 [0.0, 0.0] (n 40) | 0.00 [-0.87, 0.87] | no |
| d16 | 28 | p | 3 | 1 `pass`, 8.5 [3.5, 13.5] (n 200) | 0 `cast:26`, 0.0 [0.0, 5.0] (n 40) | -0.87 [-0.87, 0.87] | no |

### The cut design (D480)

8 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100/150 random branches stopped 3 option(s): d6 o1 at 100, d7 o2 at 50, d14 o2 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

Over 8 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.09 [-0.44, 0.59]; at 0 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 3 of 8 decision(s) (37.5% [13.7, 69.4]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d3 (turn 8, p): rank correlation -1.00 [-1.00, 1.00]; random's best `cast:6`, Forge's best `cast:24`.
- d16 (turn 28, p): rank correlation -0.87 [-0.87, 0.87]; random's best `pass`, Forge's best `cast:26`.
- d9 (turn 14, p): rank correlation -0.40 [-0.95, 0.80]; random's best `pass`, Forge's best `cast:17`.
- d7 (turn 10, p): rank correlation 0.00 [-1.00, 1.00]; random's best `cast:29`, Forge's best `cast:1`.
- d15 (turn 28, p): rank correlation 0.00 [-0.87, 0.87]; random's best `activate:18`, Forge's best `cast:21`.

### Each decision's options, side by side

**d3** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Wrenn's Resolve | 55.8 [48.8, 62.5] (n 200) | 43.8 [29.6, 59.0] (n 40) |
| 1 | `pass` | pass | 53.3 [46.3, 60.0] (n 200) | 50.0 [35.2, 64.8] (n 40) |
| 2 | `cast:24` | Mintstrosity | 51.7 [44.9, 58.6] (n 200) | 52.5 [37.5, 67.1] (n 40) |

**d6** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 58.8 [51.8, 65.3] (n 200) | 65.0 [49.5, 77.9] (n 40) |
| 1 | `cast:18` | Flayer Husk | 46.5 [37.0, 56.2] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:1` | Mindstab Thrull (may play) | 57.5 [50.6, 64.1] (n 200) | 62.5 [47.0, 75.8] (n 40) |

**d7** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Mindstab Thrull (may play) | 61.8 [54.9, 68.2] (n 200) | 66.3 [50.8, 78.9] (n 40) |
| 1 | `pass` | pass | 61.8 [54.9, 68.2] (n 200) | 50.0 [35.2, 64.8] (n 40) |
| 2 | `cast:18` | Flayer Husk | 52.0 [38.5, 65.2] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:29` | Stone Rain (may play) | 63.7 [56.9, 70.1] (n 200) | 65.0 [49.5, 77.9] (n 40) |

**d9** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Pyrotechnics | 28.7 [22.9, 35.4] (n 200) | 28.7 [17.1, 44.1] (n 40) |
| 1 | `pass` | pass | 34.5 [28.3, 41.3] (n 200) | 27.5 [16.1, 42.8] (n 40) |
| 2 | `cast:2` | Path to the World Tree | 31.3 [25.2, 38.0] (n 200) | 58.8 [43.4, 72.6] (n 40) |
| 3 | `cast:17` | Ashnod's Altar | 31.0 [25.0, 37.7] (n 200) | 62.5 [47.0, 75.8] (n 40) |

**d11** (turn 16, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Ashnod's Altar | 21.8 [16.6, 28.0] (n 200) | 32.5 [20.1, 48.0] (n 40) |
| 1 | `pass` | pass | 25.0 [19.5, 31.4] (n 200) | 38.8 [25.3, 54.2] (n 40) |
| 2 | `cast:2` | Path to the World Tree | 23.8 [18.4, 30.1] (n 200) | 35.0 [22.1, 50.5] (n 40) |

**d14** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:16` | Faerie Guidemother | 29.3 [23.4, 35.9] (n 200) | 82.5 [68.0, 91.3] (n 40) |
| 1 | `pass` | pass | 27.3 [21.6, 33.8] (n 200) | 71.3 [55.9, 82.9] (n 40) |
| 2 | `cast:21` | Regrowth | 17.0 [9.0, 29.7] (n 50, stopped at 50) | - (n 0) |

**d15** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Regrowth | 23.0 [17.7, 29.3] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 24.5 [19.1, 30.9] (n 200) | 71.3 [55.9, 82.9] (n 40) |
| 2 | `activate:18` | Flayer Husk: Equip {2} ({2}: Attach to target creature you c | 25.5 [20.0, 32.0] (n 200) | 87.5 [73.9, 94.5] (n 40) |

**d16** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:26` | Troll of Khazad-dûm | 17.5 [12.9, 23.4] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 26.0 [20.4, 32.5] (n 200) | 85.0 [70.9, 92.9] (n 40) |
| 2 | `activate:18` | Flayer Husk: Equip {2} ({2}: Attach to target creature you c | 23.8 [18.4, 30.1] (n 200) | 87.5 [73.9, 94.5] (n 40) |

5720 branch games (0 with an error, left out); 1602 random and 21 Forge branches ended at the turn cap.

## Checks

200255 rows checked (ids against each seat's own frame log), 11442 frame logs through tools/check-redaction.mjs, 5720 forks checked (0 not the position), 16 no-leak checks (0 moved; the negative control moved in 16). The guardrails read back from 9600 random seats' logs: a land offered at 41726 of 421793 priority decisions and taken at 41726; 0 of 0 opening hands kept; G3 left out a repeated no-op 7467 time(s); G5 (D458): the engine refused 29 pick(s) it could not pay for, and 19 later offer(s) of them in the same priority window were left out; G6 (D471): 2680 pick(s) of the seats' own X plays had X drawn from 1 up, 17763 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem. Warnings (never a problem): 18, below.

### Branch games the turn cap ended

1623 of 5720 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

- a warning: d3 option 0 `cast:6` (Wrenn's Resolve): 83 of 240 branch game(s) were capped (random 82 of 200, forge 1 of 40): 83 x ended at the turn cap
- a warning: d3 option 1 `pass` (pass): 91 of 240 branch game(s) were capped (random 89 of 200, forge 2 of 40): 91 x ended at the turn cap
- a warning: d3 option 2 `cast:24` (Mintstrosity): 87 of 240 branch game(s) were capped (random 85 of 200, forge 2 of 40): 87 x ended at the turn cap
- a warning: d6 option 0 `pass` (pass): 61 of 240 branch game(s) were capped (random 61 of 200, forge 0 of 40): 61 x ended at the turn cap
- a warning: d6 option 1 `cast:18` (Flayer Husk): 29 of 100 branch game(s) were capped (random 29 of 100): 29 x ended at the turn cap
- a warning: d7 option 0 `cast:1` (Mindstab Thrull (may play)): 62 of 240 branch game(s) were capped (random 59 of 200, forge 3 of 40): 62 x ended at the turn cap
- a warning: d7 option 2 `cast:18` (Flayer Husk): 18 of 50 branch game(s) were capped (random 18 of 50): 18 x ended at the turn cap
- a warning: d7 option 3 `cast:29` (Stone Rain (may play)): 61 of 240 branch game(s) were capped (random 61 of 200, forge 0 of 40): 61 x ended at the turn cap
- a warning: d9 option 1 `pass` (pass): 71 of 240 branch game(s) were capped (random 71 of 200, forge 0 of 40): 71 x ended at the turn cap
- a warning: d11 option 1 `pass` (pass): 62 of 240 branch game(s) were capped (random 61 of 200, forge 1 of 40): 62 x ended at the turn cap
- a warning: d14 option 0 `cast:16` (Faerie Guidemother): 99 of 240 branch game(s) were capped (random 99 of 200, forge 0 of 40): 99 x ended at the turn cap
- a warning: d14 option 1 `pass` (pass): 92 of 240 branch game(s) were capped (random 91 of 200, forge 1 of 40): 92 x ended at the turn cap
- a warning: d14 option 2 `cast:21` (Regrowth): 15 of 50 branch game(s) were capped (random 15 of 50): 15 x ended at the turn cap
- a warning: d15 option 0 `cast:21` (Regrowth): 64 of 240 branch game(s) were capped (random 64 of 200, forge 0 of 40): 64 x ended at the turn cap
- a warning: d15 option 1 `pass` (pass): 85 of 240 branch game(s) were capped (random 82 of 200, forge 3 of 40): 85 x ended at the turn cap
- a warning: d15 option 2 `activate:18` (Flayer Husk: Equip {2} ({2}: Attach to target creature you c): 77 of 240 branch game(s) were capped (random 77 of 200, forge 0 of 40): 77 x ended at the turn cap
- a warning: d16 option 1 `pass` (pass): 96 of 240 branch game(s) were capped (random 94 of 200, forge 2 of 40): 96 x ended at the turn cap
- a warning: d16 option 2 `activate:18` (Flayer Husk: Equip {2} ({2}: Attach to target creature you c): 81 of 240 branch game(s) were capped (random 81 of 200, forge 0 of 40): 81 x ended at the turn cap

