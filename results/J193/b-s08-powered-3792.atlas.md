# Move atlas: powered-3692-00001 vs powered-3692-00002, seed 3792

D451. Seat A is powered-3692-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 17 turns, won by A, and listed 19 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 3 | p | 4 | 2 `cast:21`, 13.3 [2.7, 24.7] (n 150) | -, - (n 0) | - | - |
| d4 | 5 | p | 4 | 2 `cast:21`, 28.7 [19.3, 38.7] (n 150) | -, - (n 0) | - | - |
| d6 | 7 | p | 4 | 2 `cast:21`, 10.3 [1.3, 18.0] (n 150) | -, - (n 0) | - | - |
| d9 | 9 | a | 4 | 0 `attack:6,9`, 0.0 [0.0, 8.0] (n 50) | -, - (n 0) | - | - |
| d10 | 11 | p | 4 | 0 `pass`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d12 | 11 | p | 4 | 0 `cast:16`, 0.0 [0.0, 0.0] (n 150) | -, - (n 0) | - | - |
| d13 | 13 | p | 3 | 0 `pass`, 0.0 [0.0, 16.0] (n 50) | -, - (n 0) | - | - |
| d14 | 13 | a | 3 | 0 `attack:16`, 0.0 [0.0, 1.0] (n 50) | -, - (n 0) | - | - |
| d15 | 13 | p | 3 | 1 `pass`, 9.7 [0.0, 19.3] (n 150) | -, - (n 0) | - | - |
| d17 | 15 | a | 5 | 2 `attack:16,21,39`, 2.0 [0.0, 8.0] (n 150) | -, - (n 0) | - | - |
| d18 | 17 | a | 5 | 0 `attack:16,21,39`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 6 of them in full (4 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 1: d18 (mean value 97.6%, replaced by d14). Early stopping at 50/100 random branches stopped 11 option(s): d4 o1 at 50, d4 o3 at 50, d6 o1 at 100, d6 o3 at 100, d12 o1 at 50, d12 o2 at 50, d12 o3 at 50, d15 o2 at 100, d17 o1 at 50, d17 o3 at 50, d17 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 6. It stopped 4 (d9, d10, d13, d14), each a partial label at that n, never confident, saving at most 1400 branch games; 2 it would have stopped played on to the full n as controls (d12, d17; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d2** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Time Vault | 41.3 [33.8, 49.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 48.3 [40.5, 56.3] (n 150) | - (n 0) |
| 2 | `cast:21` | Jace, Vryn's Prodigy | 54.7 [46.7, 62.4] (n 150) | - (n 0) |
| 3 | `cast:39` | Smuggler's Copter | 42.3 [34.7, 50.3] (n 150) | - (n 0) |

**d4** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:22` | Flame of Anor | 26.0 [19.6, 33.6] (n 150) | - (n 0) |
| 1 | `pass` | pass | 30.0 [19.1, 43.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:21` | Jace, Vryn's Prodigy | 54.7 [46.7, 62.4] (n 150) | - (n 0) |
| 3 | `cast:39` | Smuggler's Copter | 28.0 [17.5, 41.7] (n 50, stopped at 50) | - (n 0) |

**d6** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Broadside Bombardiers | 28.0 [21.4, 35.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 20.0 [13.3, 28.9] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:21` | Jace, Vryn's Prodigy | 38.3 [30.9, 46.3] (n 150) | - (n 0) |
| 3 | `cast:39` | Smuggler's Copter | 16.0 [10.1, 24.4] (n 100, stopped at 100) | - (n 0) |

**d9** (turn 9, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:6,9` | attack Broadside Bombardiers+Restless Spire | 46.0 [33.0, 59.6] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 32.0 [20.8, 45.8] (n 50) | - (n 0) |
| 2 | `attack:9` | attack Restless Spire | 35.0 [23.3, 48.9] (n 50) | - (n 0) |
| 3 | `attack:6` | attack Broadside Bombardiers | 34.0 [22.4, 47.9] (n 50) | - (n 0) |

**d10** (turn 11, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 51.0 [37.6, 64.3] (n 50) | - (n 0) |
| 1 | `cast:21` | Jace, Vryn's Prodigy | 37.0 [25.0, 50.9] (n 50) | - (n 0) |
| 2 | `cast:39` | Smuggler's Copter | 36.0 [24.1, 49.9] (n 50) | - (n 0) |
| 3 | `cast:16` | Murktide Regent | 47.0 [33.9, 60.6] (n 50) | - (n 0) |

**d12** (turn 11, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:16` | Murktide Regent | 63.3 [55.4, 70.6] (n 150) | - (n 0) |
| 1 | `pass` | pass | 48.0 [34.8, 61.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:21` | Jace, Vryn's Prodigy | 35.0 [23.3, 48.9] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:39` | Smuggler's Copter | 29.0 [18.3, 42.7] (n 50, stopped at 50) | - (n 0) |

**d13** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 47.0 [33.9, 60.6] (n 50) | - (n 0) |
| 1 | `cast:21` | Jace, Vryn's Prodigy | 45.0 [32.1, 58.7] (n 50) | - (n 0) |
| 2 | `cast:39` | Smuggler's Copter | 24.0 [14.3, 37.4] (n 50) | - (n 0) |

**d14** (turn 13, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:16` | attack Murktide Regent | 48.0 [34.8, 61.5] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 31.0 [19.9, 44.8] (n 50) | - (n 0) |
| 2 | `attack:6,16` | attack Murktide Regent+Broadside Bombardiers | 28.0 [17.5, 41.7] (n 50) | - (n 0) |

**d15** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Jace, Vryn's Prodigy | 49.7 [41.8, 57.6] (n 150) | - (n 0) |
| 1 | `pass` | pass | 59.3 [51.3, 66.9] (n 150) | - (n 0) |
| 2 | `cast:39` | Smuggler's Copter | 48.0 [38.5, 57.7] (n 100, stopped at 100) | - (n 0) |

**d17** (turn 15, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:16,39` | attack Murktide Regent+Smuggler's Copter | 92.3 [86.9, 95.6] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 40.0 [27.6, 53.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:16,21,39` | attack Murktide Regent+Smuggler's Copter+Jace, Vryn's Prodigy | 94.3 [89.4, 97.0] (n 150) | - (n 0) |
| 3 | `attack:39` | attack Smuggler's Copter | 72.0 [58.3, 82.5] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:16` | attack Murktide Regent | 76.0 [62.6, 85.7] (n 50, stopped at 50) | - (n 0) |

**d18** (turn 17, a; option 0 is Forge's answer) -- settled by the screen (mean value 97.6%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:16,21,39` | attack Murktide Regent+Jace, Vryn's Prodigy+Smuggler's Copter | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 2 | `attack:21,39` | attack Jace, Vryn's Prodigy+Smuggler's Copter | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:16,39` | attack Murktide Regent+Smuggler's Copter | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:16,21` | attack Murktide Regent+Jace, Vryn's Prodigy | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

3475 branch games (0 with an error, left out); 20 played on through a restart of the game by Karn Liberated (D477), counted as played; 181 random and 0 Forge branches ended at the turn cap.

## Checks

124808 rows checked (ids against each seat's own frame log), 6952 frame logs through tools/check-redaction.mjs, 3475 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 9). The guardrails read back from 6950 random seats' logs: a land offered at 35986 of 490580 priority decisions and taken at 35986; 40 of 40 opening hands kept; G3 left out a repeated no-op 3109 time(s); G5 (D458): the engine refused 514 pick(s) it could not pay for, and 261 later offer(s) of them in the same priority window were left out; G6 (D471): 3009 pick(s) of the seats' own X plays had X drawn from 1 up, 270728 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

181 of 3475 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

