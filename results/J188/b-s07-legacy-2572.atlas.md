# Move atlas: legacy-2472-00001 vs legacy-2472-00002, seed 2572

D451. Seat A is legacy-2472-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 17 turns, won by A, and listed 17 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 7 | p | 5 | 3 `cast:20`, 10.7 [4.7, 20.7] (n 150) | 1 `cast:27`, 2.5 [0.0, 15.0] (n 40) | 0.74 [-0.80, 0.95] | no |
| d1 | 7 | p | 4 | 0 `cast:20`, 0.0 [0.0, 12.0] (n 50) | -, - (n 0) | - | - |
| d2 | 9 | p | 6 | 0 `cast:24`, 0.0 [0.0, 5.4] (n 149) | 0 `cast:24`, 0.0 [0.0, 5.0] (n 40) | 0.00 [-0.64, 0.81] | yes |
| d3 | 9 | a | 2 | 0 `attack:20`, 0.0 [0.0, 0.0] (n 150) | 0 `attack:20`, 0.0 [0.0, 0.0] (n 40) | 1.00 [1.00, 1.00] | yes |
| d4 | 10 | b | 2 | 0 `block:24>181`, 0.0 [0.0, 4.0] (n 150) | 0 `block:24>181`, 0.0 [0.0, 0.0] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d5 | 11 | p | 5 | 2 `cast:27`, 5.3 [0.0, 13.3] (n 150) | 4 `cast:12`, 2.5 [0.0, 7.5] (n 40) | -0.63 [-0.95, 0.82] | no |
| d6 | 11 | a | 4 | 0 `attack:20,24`, 0.0 [0.0, 8.0] (n 50) | -, - (n 0) | - | - |
| d7 | 13 | p | 4 | 1 `cast:27`, 8.0 [0.0, 20.0] (n 25) | -, - (n 0) | - | - |
| d8 | 13 | a | 2 | 0 `attack:20`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d9 | 13 | p | 5 | 0 `cast:27`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d10 | 13 | p | 3 | 0 `cast:21`, 0.0 [0.0, 4.0] (n 50) | -, - (n 0) | - | - |
| d11 | 14 | b | 3 | 0 `block:none`, 0.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d12 | 15 | p | 3 | 0 `cast:15`, 0.0 [0.0, 4.0] (n 150) | 0 `cast:15`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d13 | 15 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d14 | 15 | a | 6 | 0 `attack:15,20,27`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 15 | p | 4 | 0 `cast:12`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d16 | 15 | p | 3 | 0 `cast:2`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

17 decision(s) branched, 6 of them in full (3 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 8: d7 (mean value 98.0%, replaced by d9), d11 (mean value 96.0%, replaced by d14), d15 (mean value 99.0%, replaced by d3), d16 (mean value 100.0%, nothing left to replace it), d9 (mean value 100.0%, replaced by d2), d14 (mean value 99.3%, replaced by d13), d13 (mean value 100.0%, replaced by d8), d8 (mean value 98.0%, replaced by d4). Early stopping at 50/100 random branches stopped 2 option(s): d0 o2 at 50, d5 o3 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 9 decision(s) at 50 random branches: option 0 the best or within 0 of it at 5. It stopped 3 (d1, d6, d10), each a partial label at that n, never confident, saving at most 1540 branch games; 2 it would have stopped played on to the full n as controls (d4, d3; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

Over 6 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.42 [-0.18, 0.95]; at 1 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 4 of 6 decision(s) (66.7% [30.0, 90.3]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d5 (turn 11, p): rank correlation -0.63 [-0.95, 0.82]; random's best `cast:27`, Forge's best `cast:12`.
- d2 (turn 9, p): rank correlation 0.00 [-0.64, 0.81]; random's best `cast:24`, Forge's best `cast:24`.
- d0 (turn 7, p): rank correlation 0.74 [-0.80, 0.95]; random's best `cast:20`, Forge's best `cast:27`.
- d3 (turn 9, a): rank correlation 1.00 [1.00, 1.00]; random's best `attack:20`, Forge's best `attack:20`.
- d4 (turn 10, b): rank correlation 1.00 [-1.00, 1.00]; random's best `block:24>181`, Forge's best `block:24>181`.

### Each decision's options, side by side

**d0** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 71.3 [63.6, 78.0] (n 150) | 90.0 [77.0, 96.0] (n 40) |
| 1 | `cast:27` | Solemn Simulacrum | 80.7 [73.6, 86.2] (n 150) | 92.5 [80.1, 97.4] (n 40) |
| 2 | `cast:24` | Flametongue Kavu | 60.0 [46.2, 72.4] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:20` | Battlesong Berserker | 82.0 [75.1, 87.3] (n 150) | 92.5 [80.1, 97.4] (n 40) |
| 4 | `cast:21` | Goblin Engineer | 73.3 [65.7, 79.8] (n 150) | 87.5 [73.9, 94.5] (n 40) |

**d1** (turn 7, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:20` | Battlesong Berserker | 82.0 [69.2, 90.2] (n 50) | - (n 0) |
| 1 | `pass` | pass | 72.0 [58.3, 82.5] (n 50) | - (n 0) |
| 2 | `cast:27` | Solemn Simulacrum | 68.0 [54.2, 79.2] (n 50) | - (n 0) |
| 3 | `cast:21` | Goblin Engineer | 78.0 [64.8, 87.3] (n 50) | - (n 0) |

**d2** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:24` | Flametongue Kavu | 90.6 [84.9, 94.3] (n 149) | 97.5 [87.1, 99.6] (n 40) |
| 1 | `pass` | pass | 87.9 [81.7, 92.2] (n 149) | 90.0 [77.0, 96.0] (n 40) |
| 2 | `cast:17` | Primal Might | 87.9 [81.7, 92.2] (n 149) | 82.5 [68.0, 91.3] (n 40) |
| 3 | `cast:27` | Solemn Simulacrum | 87.3 [80.9, 91.7] (n 149) | 92.5 [80.1, 97.4] (n 40) |
| 4 | `cast:21` | Goblin Engineer | 86.6 [80.2, 91.1] (n 149) | 95.0 [83.5, 98.6] (n 40) |
| 5 | `cast:12` | Biotech Specialist | 83.2 [76.4, 88.4] (n 149) | 92.5 [80.1, 97.4] (n 40) |

**d3** (turn 9, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20` | attack Battlesong Berserker | 88.7 [82.6, 92.8] (n 150) | 95.0 [83.5, 98.6] (n 40) |
| 1 | `attack:none` | attack none | 78.7 [71.4, 84.5] (n 150) | 87.5 [73.9, 94.5] (n 40) |

**d4** (turn 10, b; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:24>181` | block Flametongue Kavu>Goblin Token | 87.3 [81.1, 91.7] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 1 | `block:none` | block none | 84.7 [78.0, 89.6] (n 150) | 90.0 [77.0, 96.0] (n 40) |

**d5** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Primal Might | 85.3 [78.8, 90.1] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 1 | `pass` | pass | 89.3 [83.4, 93.3] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 2 | `cast:27` | Solemn Simulacrum | 90.7 [84.9, 94.4] (n 150) | 95.0 [83.5, 98.6] (n 40) |
| 3 | `cast:21` | Goblin Engineer | 76.0 [62.6, 85.7] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:12` | Biotech Specialist | 87.3 [81.1, 91.7] (n 150) | 100.0 [91.2, 100.0] (n 40) |

**d6** (turn 11, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20,24` | attack Battlesong Berserker+Flametongue Kavu | 96.0 [86.5, 98.9] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 86.0 [73.8, 93.0] (n 50) | - (n 0) |
| 2 | `attack:24` | attack Flametongue Kavu | 96.0 [86.5, 98.9] (n 50) | - (n 0) |
| 3 | `attack:20` | attack Battlesong Berserker | 94.0 [83.8, 97.9] (n 50) | - (n 0) |

**d7** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 1 | `cast:27` | Solemn Simulacrum | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:21` | Goblin Engineer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:12` | Biotech Specialist | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d8** (turn 13, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20` | attack Battlesong Berserker | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d9** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:27` | Solemn Simulacrum | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:21` | Goblin Engineer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:12` | Biotech Specialist | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `activate:36` | Savai Triome: Cycling {3} ({3}, Discard this card: Draw a ca | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d10** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Goblin Engineer | 98.0 [89.5, 99.7] (n 50) | - (n 0) |
| 1 | `pass` | pass | 96.0 [86.5, 98.9] (n 50) | - (n 0) |
| 2 | `cast:12` | Biotech Specialist | 96.0 [86.5, 98.9] (n 50) | - (n 0) |

**d11** (turn 14, b; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `block:27>54` | block Solemn Simulacrum>Large Bear | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `block:21>54` | block Goblin Engineer>Large Bear | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d12** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:15` | Detective's Phoenix | 96.7 [92.4, 98.6] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `pass` | pass | 94.0 [89.0, 96.8] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `cast:12` | Biotech Specialist | 96.7 [92.4, 98.6] (n 150) | 100.0 [91.2, 100.0] (n 40) |

**d13** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:12` | Biotech Specialist | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d14** (turn 15, a; option 0 is Forge's answer) -- settled by the screen (mean value 99.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:15,20,27` | attack Battlesong Berserker+Solemn Simulacrum+Detective's Phoenix | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `attack:15,20,21,27` | attack Battlesong Berserker+Solemn Simulacrum+Detective's Phoenix+Goblin Engineer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:15,27` | attack Solemn Simulacrum+Detective's Phoenix | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:15,20` | attack Battlesong Berserker+Detective's Phoenix | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:20,27` | attack Battlesong Berserker+Solemn Simulacrum | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d15** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 99.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:12` | Biotech Specialist | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `activate:36` | Savai Triome: Cycling {3} ({3}, Discard this card: Draw a ca | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 3 | `cast:2` | Ocelot Pride | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d16** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:2` | Ocelot Pride | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `activate:276` | Lander Token: {2}, {T}, Sacrifice CARDNAME: Search your libr | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

5365 branch games (1 with an error, left out); 0 random and 0 Forge branches ended at the turn cap.

## Checks

129078 rows checked (ids against each seat's own frame log), 10732 frame logs through tools/check-redaction.mjs, 5365 forks checked (0 not the position), 23 no-leak checks (0 moved; the negative control moved in 23). The guardrails read back from 9050 random seats' logs: a land offered at 26818 of 205968 priority decisions and taken at 26818; 0 of 0 opening hands kept; G3 left out a repeated no-op 1069 time(s); G5 (D458): the engine refused 42 pick(s) it could not pay for, and 16 later offer(s) of them in the same priority window were left out; G6 (D471): 2582 pick(s) of the seats' own X plays had X drawn from 1 up, 102798 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games that errored

1 of 5365 branch game(s) errored and are left out of their option's value. By error text (ids as #):

| branch games | error |
|---|---|
| 1 | IndexOutOfBoundsException: Index # out of bounds for length # |

No option had more than 10.0% of its branch games errored.

