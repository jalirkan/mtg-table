# Move atlas: powered-3696-00001 vs powered-3696-00002, seed 3796

D451. Seat A is powered-3696-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 14 turns, won by B, and listed 23 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d6 | 5 | a | 2 | 0 `attack:20`, 0.0 [0.0, 8.7] (n 150) | -, - (n 0) | - | - |
| d9 | 7 | a | 3 | 0 `attack:20`, 0.0 [0.0, 6.0] (n 50) | -, - (n 0) | - | - |
| d11 | 9 | p | 3 | 2 `cast:33`, 4.0 [0.0, 12.7] (n 150) | -, - (n 0) | - | - |
| d12 | 9 | a | 4 | 2 `attack:24`, 6.0 [0.0, 14.0] (n 150) | -, - (n 0) | - | - |
| d13 | 9 | p | 4 | 2 `cast:33`, 14.0 [7.3, 24.7] (n 150) | -, - (n 0) | - | - |
| d15 | 11 | p | 3 | 0 `activate:87`, 0.0 [0.0, 4.7] (n 150) | -, - (n 0) | - | - |
| d17 | 11 | a | 4 | 0 `attack:20,24`, 0.0 [0.0, 6.0] (n 50) | -, - (n 0) | - | - |
| d18 | 11 | p | 3 | 1 `pass`, 9.3 [4.0, 15.3] (n 150) | -, - (n 0) | - | - |
| d19 | 11 | p | 2 | 0 `activate:94`, 0.0 [0.0, 8.0] (n 50) | -, - (n 0) | - | - |
| d20 | 13 | a | 5 | 2 `attack:20,24,33`, 94.0 [90.0, 97.3] (n 150) | -, - (n 0) | - | - |
| d21 | 13 | p | 2 | 0 `activate:106`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d22 | 14 | b | 4 | 0 `block:33>51,20>57`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

12 decision(s) branched, 7 of them in full (3 more stopped by the futility rule, D489); picked among those with 3 or more options first (1 filled from the rest). The screen at 25 random branches settled 2: d22 (mean value 0.0%, replaced by d21), d21 (mean value 0.0%, replaced by d19). Early stopping at 50/100 random branches stopped 6 option(s): d12 o1 at 50, d12 o3 at 50, d15 o2 at 100, d20 o1 at 50, d20 o3 at 50, d20 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 3 (d9, d17, d19), each a partial label at that n, never confident, saving at most 900 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d6** (turn 5, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20` | attack Flitterwing Nuisance | 55.3 [47.3, 63.1] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 55.3 [47.3, 63.1] (n 150) | - (n 0) |

**d9** (turn 7, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20` | attack Flitterwing Nuisance | 42.0 [29.4, 55.8] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 34.0 [22.4, 47.9] (n 50) | - (n 0) |
| 2 | `attack:20,24` | attack Flitterwing Nuisance+Sentinel of the Nameless City | 28.0 [17.5, 41.7] (n 50) | - (n 0) |

**d11** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 19.3 [13.8, 26.4] (n 150) | - (n 0) |
| 1 | `cast:15` | Manabarbs | 13.3 [8.8, 19.7] (n 150) | - (n 0) |
| 2 | `cast:33` | Tracker | 23.3 [17.3, 30.7] (n 150) | - (n 0) |

**d12** (turn 9, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20,24` | attack Flitterwing Nuisance+Sentinel of the Nameless City | 32.7 [25.7, 40.5] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 14.0 [7.0, 26.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:24` | attack Sentinel of the Nameless City | 38.7 [31.3, 46.7] (n 150) | - (n 0) |
| 3 | `attack:20` | attack Flitterwing Nuisance | 18.0 [9.8, 30.8] (n 50, stopped at 50) | - (n 0) |

**d13** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:15` | Manabarbs | 26.0 [19.6, 33.6] (n 150) | - (n 0) |
| 1 | `pass` | pass | 32.7 [25.7, 40.5] (n 150) | - (n 0) |
| 2 | `cast:33` | Tracker | 40.0 [32.5, 48.0] (n 150) | - (n 0) |
| 3 | `activate:87` | Map Token: {1}, {T}, Sacrifice this token: Target creature y | 39.7 [32.2, 47.7] (n 150) | - (n 0) |

**d15** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:87` | Map Token: {1}, {T}, Sacrifice this token: Target creature y | 14.0 [9.3, 20.5] (n 150) | - (n 0) |
| 1 | `pass` | pass | 11.3 [7.2, 17.4] (n 150) | - (n 0) |
| 2 | `cast:33` | Tracker | 8.0 [4.1, 15.0] (n 100, stopped at 100) | - (n 0) |

**d17** (turn 11, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20,24` | attack Flitterwing Nuisance+Sentinel of the Nameless City | 14.0 [7.0, 26.2] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 6.0 [2.1, 16.2] (n 50) | - (n 0) |
| 2 | `attack:24` | attack Sentinel of the Nameless City | 10.0 [4.3, 21.4] (n 50) | - (n 0) |
| 3 | `attack:20` | attack Flitterwing Nuisance | 6.0 [2.1, 16.2] (n 50) | - (n 0) |

**d18** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:33` | Tracker | 19.3 [13.8, 26.4] (n 150) | - (n 0) |
| 1 | `pass` | pass | 28.7 [22.0, 36.4] (n 150) | - (n 0) |
| 2 | `activate:94` | Map Token: {1}, {T}, Sacrifice this token: Target creature y | 25.3 [19.1, 32.9] (n 150) | - (n 0) |

**d19** (turn 11, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:94` | Map Token: {1}, {T}, Sacrifice this token: Target creature y | 14.0 [7.0, 26.2] (n 50) | - (n 0) |
| 1 | `pass` | pass | 14.0 [7.0, 26.2] (n 50) | - (n 0) |

**d20** (turn 13, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:24` | attack Sentinel of the Nameless City | 3.3 [1.4, 7.6] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:20,24,33` | attack Sentinel of the Nameless City+Flitterwing Nuisance+Tracker | 97.3 [93.3, 99.0] (n 150) | - (n 0) |
| 3 | `attack:20,24` | attack Sentinel of the Nameless City+Flitterwing Nuisance | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:24,33` | attack Sentinel of the Nameless City+Tracker | 44.0 [31.2, 57.7] (n 50, stopped at 50) | - (n 0) |

**d21** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:106` | Map Token: {1}, {T}, Sacrifice this token: Target creature y | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d22** (turn 14, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:33>51,20>57` | block Tracker>Siege-Gang Commander, Flitterwing Nuisance>Pelt Collector | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:20>57` | block Flitterwing Nuisance>Pelt Collector | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:33>51` | block Tracker>Siege-Gang Commander | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

3650 branch games (0 with an error, left out); 1 random and 0 Forge branches ended at the turn cap.

## Checks

55643 rows checked (ids against each seat's own frame log), 7302 frame logs through tools/check-redaction.mjs, 3650 forks checked (0 not the position), 12 no-leak checks (0 moved; the negative control moved in 12). The guardrails read back from 7300 random seats' logs: a land offered at 12195 of 133625 priority decisions and taken at 12195; 0 of 0 opening hands kept; G3 left out a repeated no-op 2632 time(s); G5 (D458): the engine refused 3313 pick(s) it could not pay for, and 959 later offer(s) of them in the same priority window were left out; G6 (D471): 465 pick(s) of the seats' own X plays had X drawn from 1 up, 8742 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

1 of 3650 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

