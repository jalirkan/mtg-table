# Move atlas: pauper-2466-00001 vs pauper-2466-00002, seed 2566

D451. Seat A is pauper-2466-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 17 turns, won by A, and listed 21 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 7 | p | 4 | 1 `pass`, 10.7 [4.7, 21.3] (n 150) | 0 `cast:1`, 0.0 [0.0, 2.6] (n 39) | -0.20 [-1.00, 0.32] | no |
| d5 | 9 | a | 4 | 0 `attack:1,100`, 0.0 [0.0, 7.0] (n 150) | 0 `attack:1,100`, 0.0 [0.0, 2.5] (n 40) | 0.32 [-0.95, 0.95] | yes |
| d6 | 9 | p | 4 | 0 `cast:9`, 0.0 [0.0, 3.0] (n 50) | -, - (n 0) | - | - |
| d7 | 11 | p | 4 | 3 `cast:23`, 0.7 [0.0, 10.7] (n 150) | 3 `cast:23`, 11.5 [0.0, 27.0] (n 39) | 0.80 [-0.63, 1.00] | yes |
| d8 | 11 | a | 5 | 2 `attack:1,9,100`, 7.3 [0.0, 16.7] (n 150) | 2 `attack:1,9,100`, 12.8 [0.0, 30.8] (n 39) | 0.87 [-1.00, 1.00] | yes |
| d9 | 11 | p | 4 | 0 `cast:23`, 0.0 [0.0, 6.7] (n 150) | 0 `cast:23`, 0.0 [0.0, 12.8] (n 39) | 1.00 [-1.00, 1.00] | yes |
| d11 | 13 | p | 3 | 0 `pass`, 0.0 [0.0, 12.0] (n 50) | -, - (n 0) | - | - |
| d12 | 13 | a | 6 | 2 `attack:1,11,23,100`, 4.3 [0.0, 11.3] (n 150) | 2 `attack:1,11,23,100`, 2.5 [0.0, 7.5] (n 40) | 0.45 [-0.77, 0.89] | yes |
| d13 | 13 | p | 3 | 2 `cast:39`, 4.0 [0.0, 11.7] (n 150) | 0 `cast:16`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d14 | 13 | p | 5 | 3 `cast:26`, 0.3 [0.0, 4.0] (n 150) | 3 `cast:26`, 2.5 [0.0, 7.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d15 | 15 | p | 5 | 2 `cast:26`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d16 | 15 | a | 8 | 0 `attack:1,11,23,100,146,147`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d17 | 15 | p | 5 | 0 `cast:16`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d18 | 15 | p | 3 | 0 `cast:38`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d20 | 17 | a | 7 | 0 `attack:1,11,23,38,147`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

15 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 5: d16 (mean value 98.0%, replaced by d18), d17 (mean value 100.0%, replaced by d9), d20 (mean value 100.0%, replaced by d7), d18 (mean value 100.0%, replaced by d15), d15 (mean value 97.6%, replaced by d13). Early stopping at 50/100 random branches stopped 9 option(s): d8 o1 at 100, d8 o4 at 50, d12 o1 at 50, d12 o5 at 100, d14 o1 at 100, d14 o2 at 100, d14 o4 at 50, d13 o1 at 50, d9 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 2 (d6, d11), each a partial label at that n, never confident, saving at most 980 branch games; 1 it would have stopped played on to the full n as controls (d9; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

Over 8 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.60 [0.28, 0.87]; at 0 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 6 of 8 decision(s) (75.0% [40.9, 92.8]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d2 (turn 7, p): rank correlation -0.20 [-1.00, 0.32]; random's best `pass`, Forge's best `cast:1`.
- d5 (turn 9, a): rank correlation 0.32 [-0.95, 0.95]; random's best `attack:1,100`, Forge's best `attack:1,100`.
- d12 (turn 13, a): rank correlation 0.45 [-0.77, 0.89]; random's best `attack:1,11,23,100`, Forge's best `attack:1,11,23,100`.
- d7 (turn 11, p): rank correlation 0.80 [-0.63, 1.00]; random's best `cast:23`, Forge's best `cast:23`.
- d8 (turn 11, a): rank correlation 0.87 [-1.00, 1.00]; random's best `attack:1,9,100`, Forge's best `attack:1,9,100`.

### Each decision's options, side by side

**d2** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Qasali Pridemage | 41.0 [33.5, 49.0] (n 150) | 82.0 [67.3, 91.0] (n 39) |
| 1 | `pass` | pass | 51.7 [43.7, 59.5] (n 150) | 74.4 [58.9, 85.4] (n 39) |
| 2 | `cast:39` | Judge's Familiar | 49.7 [41.8, 57.6] (n 150) | 71.8 [56.2, 83.5] (n 39) |
| 3 | `cast:16` | Pursue the Past | 51.3 [43.4, 59.2] (n 150) | 73.1 [57.6, 84.5] (n 39) |

**d5** (turn 9, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,100` | attack Qasali Pridemage+Robot Token | 55.3 [47.3, 63.1] (n 150) | 90.0 [77.0, 96.0] (n 40) |
| 1 | `attack:none` | attack none | 53.3 [45.4, 61.1] (n 150) | 75.0 [59.8, 85.8] (n 40) |
| 2 | `attack:100` | attack Robot Token | 55.0 [47.0, 62.7] (n 150) | 75.0 [59.8, 85.8] (n 40) |
| 3 | `attack:1` | attack Qasali Pridemage | 53.0 [45.0, 60.8] (n 150) | 85.0 [70.9, 92.9] (n 40) |

**d6** (turn 9, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:9` | Inspiring Overseer | 70.0 [56.3, 80.9] (n 50) | - (n 0) |
| 1 | `pass` | pass | 55.0 [41.3, 67.9] (n 50) | - (n 0) |
| 2 | `cast:39` | Judge's Familiar | 53.0 [39.5, 66.1] (n 50) | - (n 0) |
| 3 | `cast:16` | Pursue the Past | 54.0 [40.4, 67.0] (n 50) | - (n 0) |

**d7** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 43.3 [35.7, 51.3] (n 150) | 51.3 [36.2, 66.1] (n 39) |
| 1 | `cast:39` | Judge's Familiar | 36.0 [28.8, 43.9] (n 150) | 53.8 [38.6, 68.4] (n 39) |
| 2 | `cast:16` | Pursue the Past | 34.3 [27.2, 42.2] (n 150) | 43.6 [29.3, 59.0] (n 39) |
| 3 | `cast:23` | Search Party Captain | 44.0 [36.3, 52.0] (n 150) | 62.8 [47.1, 76.2] (n 39) |

**d8** (turn 11, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,9` | attack Qasali Pridemage+Inspiring Overseer | 47.0 [39.2, 55.0] (n 150) | 53.8 [38.6, 68.4] (n 39) |
| 1 | `attack:none` | attack none | 43.0 [33.7, 52.8] (n 100, stopped at 100) | - (n 0) |
| 2 | `attack:1,9,100` | attack Qasali Pridemage+Inspiring Overseer+Robot Token | 54.3 [46.4, 62.1] (n 150) | 66.7 [51.0, 79.4] (n 39) |
| 3 | `attack:9` | attack Inspiring Overseer | 49.3 [41.4, 57.3] (n 150) | 53.8 [38.6, 68.4] (n 39) |
| 4 | `attack:1` | attack Qasali Pridemage | 40.0 [27.6, 53.8] (n 50, stopped at 50) | - (n 0) |

**d9** (turn 11, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:23` | Search Party Captain | 54.3 [46.4, 62.1] (n 150) | 64.1 [48.4, 77.3] (n 39) |
| 1 | `pass` | pass | 38.0 [25.9, 51.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:39` | Judge's Familiar | 49.3 [41.4, 57.3] (n 150) | 56.4 [41.0, 70.7] (n 39) |
| 3 | `cast:16` | Pursue the Past | 48.0 [40.2, 55.9] (n 150) | 51.3 [36.2, 66.1] (n 39) |

**d11** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 70.0 [56.3, 80.9] (n 50) | - (n 0) |
| 1 | `cast:39` | Judge's Familiar | 64.0 [50.1, 75.9] (n 50) | - (n 0) |
| 2 | `cast:16` | Pursue the Past | 63.0 [49.1, 75.0] (n 50) | - (n 0) |

**d12** (turn 13, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,11,23` | attack Qasali Pridemage+Search Party Captain+Mountain Yeti | 73.0 [65.4, 79.5] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 1 | `attack:none` | attack none | 56.0 [42.3, 68.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:1,11,23,100` | attack Qasali Pridemage+Search Party Captain+Mountain Yeti+Robot Token | 77.3 [70.0, 83.3] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `attack:11,23` | attack Search Party Captain+Mountain Yeti | 71.7 [64.0, 78.3] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 4 | `attack:1,11` | attack Qasali Pridemage+Mountain Yeti | 70.0 [62.2, 76.8] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 5 | `attack:1,23` | attack Qasali Pridemage+Search Party Captain | 57.0 [47.2, 66.3] (n 100, stopped at 100) | - (n 0) |

**d13** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:16` | Pursue the Past | 79.3 [72.2, 85.0] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `pass` | pass | 66.0 [52.1, 77.6] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:39` | Judge's Familiar | 83.3 [76.5, 88.4] (n 150) | 100.0 [91.2, 100.0] (n 40) |

**d14** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Borough Backup | 96.7 [92.4, 98.6] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 1 | `pass` | pass | 86.0 [77.9, 91.5] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:39` | Judge's Familiar | 92.0 [85.0, 95.9] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:26` | Thermo-Alchemist | 97.0 [92.9, 98.8] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 4 | `cast:16` | Pursue the Past | 80.0 [67.0, 88.8] (n 50, stopped at 50) | - (n 0) |

**d15** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 97.6%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `cast:39` | Judge's Familiar | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `cast:26` | Thermo-Alchemist | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:38` | Stormfront Pegasus | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:16` | Pursue the Past | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d16** (turn 15, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,11,23,100,146,147` | attack Qasali Pridemage+Hero Token+Hero Token+Robot Token+Search Party Captain+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 84.0 [65.3, 93.6] (n 25) | - (n 0) |
| 2 | `attack:11,23,100,146,147` | attack Hero Token+Hero Token+Robot Token+Search Party Captain+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:1,11,23,100,147` | attack Qasali Pridemage+Hero Token+Robot Token+Search Party Captain+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:1,11,23,100,146` | attack Qasali Pridemage+Hero Token+Robot Token+Search Party Captain+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:1,11,23,146,147` | attack Qasali Pridemage+Hero Token+Hero Token+Search Party Captain+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:1,11,100,146,147` | attack Qasali Pridemage+Hero Token+Hero Token+Robot Token+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:1,23,100,146,147` | attack Qasali Pridemage+Hero Token+Hero Token+Robot Token+Search Party Captain | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d17** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:16` | Pursue the Past | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:39` | Judge's Familiar | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:26` | Thermo-Alchemist | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:38` | Stormfront Pegasus | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d18** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:38` | Stormfront Pegasus | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:39` | Judge's Familiar | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d20** (turn 17, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,11,23,38,147` | attack Qasali Pridemage+Hero Token+Stormfront Pegasus+Search Party Captain+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:11,23,38,147` | attack Hero Token+Stormfront Pegasus+Search Party Captain+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:1,11,23,38` | attack Qasali Pridemage+Stormfront Pegasus+Search Party Captain+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:1,11,23,147` | attack Qasali Pridemage+Hero Token+Search Party Captain+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:1,11,38,147` | attack Qasali Pridemage+Hero Token+Stormfront Pegasus+Mountain Yeti | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:1,23,38,147` | attack Qasali Pridemage+Hero Token+Stormfront Pegasus+Search Party Captain | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

6640 branch games (4 with an error, left out; 4 of them engine errors, a Java Error such as OutOfMemoryError (D465)); 203 random and 2 Forge branches ended at the turn cap.

## Checks

307512 rows checked (ids against each seat's own frame log), 13282 frame logs through tools/check-redaction.mjs, 6640 forks checked (0 not the position), 23 no-leak checks (0 moved; the negative control moved in 23). The guardrails read back from 11200 random seats' logs: a land offered at 55554 of 816406 priority decisions and taken at 55554; 0 of 0 opening hands kept; G3 left out a repeated no-op 0 time(s); G5 (D458): the engine refused 3 pick(s) it could not pay for, and 3 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 13907 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games that errored

4 of 6640 branch game(s) errored and are left out of their option's value. By error text (ids as #):

| branch games | error |
|---|---|
| 2 | BranchTimeout: the branch's deadline passed inside one engine step (# events into its play) at turn # MAIN#, step # |
| 1 | BranchTimeout: the branch's deadline passed at a decision (playChosenSpellAbility, # decisions into its play) at turn # END_OF_TURN, step # |
| 1 | BranchTimeout: the branch's deadline passed inside one engine step (# events into its play) at turn # COMBAT_DECLARE_ATTACKERS, step # |

No option had more than 10.0% of its branch games errored.

### Branch games the turn cap ended

205 of 6640 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

