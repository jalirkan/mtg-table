# Move atlas: powered-2012-00001 vs powered-2012-00002, seed 2112

D451. Seat A is powered-2012-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 12 turns, won by B, and listed 14 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 1 | p | 2 | 1 `cast:22`, 2.8 [0.0, 10.8] (n 200) | -, - (n 0) | - | - |
| d4 | 5 | p | 3 | 0 `cast:29`, 0.0 [0.0, 0.1] (n 200) | -, - (n 0) | - | - |
| d5 | 5 | a | 2 | 0 `attack:29`, 0.0 [0.0, 0.0] (n 199) | -, - (n 0) | - | - |
| d7 | 7 | a | 3 | 0 `attack:29`, 0.0 [0.0, 6.0] (n 199) | -, - (n 0) | - | - |
| d10 | 9 | a | 5 | 0 `attack:22,29,37`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |
| d11 | 11 | p | 4 | 2 `cast:20`, 19.5 [10.5, 28.0] (n 200) | -, - (n 0) | - | - |
| d12 | 11 | p | 2 | 1 `cast:20`, 19.5 [11.0, 27.5] (n 200) | -, - (n 0) | - | - |
| d13 | 11 | a | 3 | 2 `attack:29,37`, 24.0 [15.0, 32.0] (n 200) | -, - (n 0) | - | - |

### The cut design (D480)

8 decision(s) branched, 8 of them in full; picked among those with 3 or more options first (3 filled from the rest). The screen at 25 random branches settled 0: none. Early stopping at 50/100/150 random branches stopped 9 option(s): d4 o1 at 50, d4 o2 at 100, d7 o1 at 50, d10 o1 at 50, d10 o2 at 100, d10 o3 at 100, d10 o4 at 50, d11 o1 at 50, d13 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 1, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 59.5 [52.6, 66.1] (n 200) | - (n 0) |
| 1 | `cast:22` | Delighted Halfling | 62.3 [55.4, 68.7] (n 200) | - (n 0) |

**d4** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:29` | Laelia, the Blade Reforged | 55.0 [48.1, 61.7] (n 200) | - (n 0) |
| 1 | `pass` | pass | 32.0 [20.8, 45.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:21` | Agatha's Soul Cauldron | 44.0 [34.7, 53.8] (n 100, stopped at 100) | - (n 0) |

**d5** (turn 5, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:29` | attack Laelia, the Blade Reforged | 62.3 [55.4, 68.8] (n 199) | - (n 0) |
| 1 | `attack:none` | attack none | 53.8 [46.8, 60.6] (n 199) | - (n 0) |

**d7** (turn 7, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:29` | attack Laelia, the Blade Reforged | 60.8 [53.9, 67.3] (n 199) | - (n 0) |
| 1 | `attack:none` | attack none | 34.7 [22.9, 48.7] (n 49, stopped at 50) | - (n 0) |
| 2 | `attack:22,29` | attack Laelia, the Blade Reforged+Delighted Halfling | 58.8 [51.8, 65.4] (n 199) | - (n 0) |

**d10** (turn 9, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:22,29,37` | attack Restless Ridgeline+Delighted Halfling+Laelia, the Blade Reforged | 75.0 [68.6, 80.5] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 42.0 [29.4, 55.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:22,29` | attack Delighted Halfling+Laelia, the Blade Reforged | 60.0 [50.2, 69.1] (n 100, stopped at 100) | - (n 0) |
| 3 | `attack:29,37` | attack Restless Ridgeline+Laelia, the Blade Reforged | 64.0 [54.2, 72.7] (n 100, stopped at 100) | - (n 0) |
| 4 | `attack:22,37` | attack Restless Ridgeline+Delighted Halfling | 46.0 [33.0, 59.6] (n 50, stopped at 50) | - (n 0) |

**d11** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:29` | Laelia, the Blade Reforged (may play) | 38.0 [31.6, 44.9] (n 200) | - (n 0) |
| 1 | `pass` | pass | 22.0 [12.8, 35.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:20` | Grist, the Hunger Tide | 57.5 [50.6, 64.1] (n 200) | - (n 0) |
| 3 | `cast:24` | Omnath, Locus of Rage | 42.5 [35.9, 49.4] (n 200) | - (n 0) |

**d12** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 33.5 [27.3, 40.3] (n 200) | - (n 0) |
| 1 | `cast:20` | Grist, the Hunger Tide | 53.0 [46.1, 59.8] (n 200) | - (n 0) |

**d13** (turn 11, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:37` | attack Restless Ridgeline | 26.5 [20.9, 33.0] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 30.0 [19.1, 43.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:29,37` | attack Restless Ridgeline+Laelia, the Blade Reforged | 50.5 [43.6, 57.4] (n 200) | - (n 0) |

3600 branch games (2 with an error, left out); 1 random and 0 Forge branches ended at the turn cap.

## Checks

103526 rows checked (ids against each seat's own frame log), 7202 frame logs through tools/check-redaction.mjs, 3600 forks checked (0 not the position), 8 no-leak checks (0 moved; the negative control moved in 8). The guardrails read back from 7200 random seats' logs: a land offered at 27378 of 490660 priority decisions and taken at 27378; 0 of 0 opening hands kept; G3 left out a repeated no-op 255 time(s); G5 (D458): the engine refused 2 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 707 pick(s) of the seats' own X plays had X drawn from 1 up, 1973 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games that errored

2 of 3600 branch game(s) errored and are left out of their option's value. By error text (ids as #):

| branch games | error |
|---|---|
| 2 | IndexOutOfBoundsException: Index # out of bounds for length # |

No option had more than 10.0% of its branch games errored.

### Branch games the turn cap ended

1 of 3600 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

