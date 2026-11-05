# Move atlas: pauper-2817-00001 vs pauper-2817-00002, seed 2917

D451. Seat A is pauper-2817-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 16 turns, won by A, and listed 20 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 6 | p | 4 | 0 `cast:19`, 0.0 [0.0, 5.3] (n 150) | 0 `cast:19`, 0.0 [0.0, 15.0] (n 40) | 0.32 [-0.95, 0.95] | yes |
| d3 | 6 | p | 2 | 0 `activate:17`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d4 | 8 | p | 5 | 4 `cast:1`, 6.0 [0.0, 13.0] (n 150) | 3 `cast:14`, 9.0 [0.0, 20.5] (n 39) | -0.50 [-0.95, 0.82] | no |
| d5 | 8 | p | 5 | 0 `cast:14`, 0.0 [0.0, 6.0] (n 50) | -, - (n 0) | - | - |
| d6 | 8 | p | 2 | 1 `pass`, 2.0 [0.0, 8.3] (n 150) | 0 `activate:14`, 0.0 [0.0, 0.0] (n 39) | -1.00 [-1.00, 1.00] | no |
| d7 | 10 | p | 5 | 4 `cast:1`, 0.3 [0.0, 6.7] (n 150) | 0 `activate:14`, 0.0 [0.0, 13.2] (n 38) | 0.77 [-0.89, 0.95] | no |
| d8 | 10 | p | 4 | 0 `pass`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d9 | 10 | a | 2 | 0 `attack:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d10 | 10 | p | 4 | 0 `cast:11`, 0.0 [0.0, 3.0] (n 50) | -, - (n 0) | - | - |
| d11 | 10 | p | 3 | 2 `cast:1`, 4.7 [0.0, 11.7] (n 150) | 2 `cast:1`, 5.0 [0.0, 16.3] (n 40) | 1.00 [-0.50, 1.00] | yes |
| d12 | 10 | p | 2 | 0 `cast:1`, 0.0 [0.0, 9.0] (n 50) | -, - (n 0) | - | - |
| d13 | 12 | p | 2 | 1 `cast:25`, 2.0 [0.0, 6.0] (n 25) | -, - (n 0) | - | - |
| d14 | 12 | a | 8 | 0 `attack:11,84,88`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 12 | p | 3 | 0 `cast:25`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d16 | 14 | a | 8 | 1 `attack:none`, 4.0 [0.0, 12.1] (n 25) | -, - (n 0) | - | - |
| d17 | 14 | p | 2 | 0 `cast:26`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d18 | 16 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d19 | 16 | a | 8 | 0 `attack:1,11,21,25,84,88`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

18 decision(s) branched, 5 of them in full (5 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 8: d14 (mean value 96.5%, replaced by d10), d15 (mean value 100.0%, replaced by d17), d16 (mean value 99.0%, replaced by d9), d19 (mean value 100.0%, replaced by d3), d17 (mean value 100.0%, replaced by d18), d18 (mean value 100.0%, replaced by d13), d13 (mean value 99.0%, replaced by d12), d9 (mean value 98.0%, replaced by d6). Early stopping at 50/100 random branches stopped 1 option(s): d7 o1 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 5. It stopped 5 (d5, d8, d10, d12, d3), each a partial label at that n, never confident, saving at most 2380 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

Over 5 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.12 [-0.55, 0.73]; at 0 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 2 of 5 decision(s) (40.0% [11.8, 76.9]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d6 (turn 8, p): rank correlation -1.00 [-1.00, 1.00]; random's best `pass`, Forge's best `activate:14`.
- d4 (turn 8, p): rank correlation -0.50 [-0.95, 0.82]; random's best `cast:1`, Forge's best `cast:14`.
- d2 (turn 6, p): rank correlation 0.32 [-0.95, 0.95]; random's best `cast:19`, Forge's best `cast:19`.
- d7 (turn 10, p): rank correlation 0.77 [-0.89, 0.95]; random's best `cast:1`, Forge's best `activate:14`.
- d11 (turn 10, p): rank correlation 1.00 [-0.50, 1.00]; random's best `cast:1`, Forge's best `cast:1`.

### Each decision's options, side by side

**d2** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:19` | Farseek | 89.0 [83.0, 93.1] (n 150) | 67.5 [52.0, 79.9] (n 40) |
| 1 | `pass` | pass | 85.3 [78.8, 90.1] (n 150) | 65.0 [49.5, 77.9] (n 40) |
| 2 | `cast:11` | Grizzly Bears | 87.0 [80.7, 91.5] (n 150) | 65.0 [49.5, 77.9] (n 40) |
| 3 | `cast:21` | Wyluli Wolf | 87.7 [81.5, 92.0] (n 150) | 53.8 [38.7, 68.2] (n 40) |

**d3** (turn 6, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:17` | Ash Barrens: Basic landcycling {1} ({1}, Discard this card:  | 88.0 [76.2, 94.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 86.0 [73.8, 93.0] (n 50) | - (n 0) |

**d4** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 83.7 [76.9, 88.7] (n 150) | 80.8 [65.9, 90.1] (n 39) |
| 1 | `cast:11` | Grizzly Bears | 85.0 [78.4, 89.8] (n 150) | 78.2 [63.1, 88.3] (n 39) |
| 2 | `cast:21` | Wyluli Wolf | 84.7 [78.0, 89.6] (n 150) | 78.2 [63.1, 88.3] (n 39) |
| 3 | `cast:14` | Vraska, Swarm's Eminence | 85.0 [78.4, 89.8] (n 150) | 89.7 [76.4, 95.9] (n 39) |
| 4 | `cast:1` | Spirited Companion | 89.7 [83.8, 93.6] (n 150) | 74.4 [58.9, 85.4] (n 39) |

**d5** (turn 8, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:14` | Vraska, Swarm's Eminence | 94.0 [83.8, 97.9] (n 50) | - (n 0) |
| 1 | `pass` | pass | 88.0 [76.2, 94.4] (n 50) | - (n 0) |
| 2 | `cast:11` | Grizzly Bears | 86.0 [73.8, 93.0] (n 50) | - (n 0) |
| 3 | `cast:21` | Wyluli Wolf | 86.0 [73.8, 93.0] (n 50) | - (n 0) |
| 4 | `cast:1` | Spirited Companion | 92.0 [81.2, 96.9] (n 50) | - (n 0) |

**d6** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:14` | Vraska, Swarm's Eminence: -2: Create a 1/1 black Assassin cr | 89.0 [83.0, 93.1] (n 150) | 73.1 [57.6, 84.5] (n 39) |
| 1 | `pass` | pass | 91.0 [85.3, 94.6] (n 150) | 52.6 [37.4, 67.3] (n 39) |

**d7** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:14` | Vraska, Swarm's Eminence: -2: Create a 1/1 black Assassin cr | 87.3 [81.1, 91.7] (n 150) | 84.2 [69.6, 92.6] (n 38) |
| 1 | `pass` | pass | 77.0 [67.8, 84.2] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:11` | Grizzly Bears | 86.7 [80.3, 91.2] (n 150) | 84.2 [69.6, 92.6] (n 38) |
| 3 | `cast:21` | Wyluli Wolf | 84.3 [77.7, 89.3] (n 150) | 81.6 [66.6, 90.8] (n 38) |
| 4 | `cast:1` | Spirited Companion | 87.7 [81.5, 92.0] (n 150) | 84.2 [69.6, 92.6] (n 38) |

**d8** (turn 10, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 90.0 [78.6, 95.7] (n 50) | - (n 0) |
| 1 | `cast:11` | Grizzly Bears | 89.0 [77.4, 95.0] (n 50) | - (n 0) |
| 2 | `cast:21` | Wyluli Wolf | 89.0 [77.4, 95.0] (n 50) | - (n 0) |
| 3 | `cast:1` | Spirited Companion | 90.0 [78.6, 95.7] (n 50) | - (n 0) |

**d9** (turn 10, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:84` | attack Assassin Token | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d10** (turn 10, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Grizzly Bears | 95.0 [85.1, 98.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 82.0 [69.2, 90.2] (n 50) | - (n 0) |
| 2 | `cast:21` | Wyluli Wolf | 87.0 [75.0, 93.7] (n 50) | - (n 0) |
| 3 | `cast:1` | Spirited Companion | 86.0 [73.8, 93.0] (n 50) | - (n 0) |

**d11** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Wyluli Wolf | 85.7 [79.2, 90.4] (n 150) | 81.3 [66.6, 90.4] (n 40) |
| 1 | `pass` | pass | 84.7 [78.0, 89.6] (n 150) | 67.5 [52.0, 79.9] (n 40) |
| 2 | `cast:1` | Spirited Companion | 90.3 [84.5, 94.1] (n 150) | 86.3 [72.4, 93.8] (n 40) |

**d12** (turn 10, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Spirited Companion | 93.0 [82.5, 97.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 92.0 [81.2, 96.9] (n 50) | - (n 0) |

**d13** (turn 12, p; option 0 is Forge's answer) -- settled by the screen (mean value 99.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 98.0 [83.4, 99.8] (n 25) | - (n 0) |
| 1 | `cast:25` | Aerie Auxiliary | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d14** (turn 12, a; option 0 is Forge's answer) -- settled by the screen (mean value 96.5%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:11,84,88` | attack Assassin Token+Assassin Token+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 2 | `attack:1,11,21,84,88` | attack Assassin Token+Assassin Token+Grizzly Bears+Wyluli Wolf+Spirited Companion | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 3 | `attack:11,88` | attack Assassin Token+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:11,84` | attack Assassin Token+Grizzly Bears | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 5 | `attack:84,88` | attack Assassin Token+Assassin Token | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 6 | `attack:11,21,84,88` | attack Assassin Token+Assassin Token+Grizzly Bears+Wyluli Wolf | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:1,11,84,88` | attack Assassin Token+Assassin Token+Grizzly Bears+Spirited Companion | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d15** (turn 12, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:25` | Aerie Auxiliary | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:26` | Momentary Blink | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d16** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 99.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:11,25,84,88` | attack Assassin Token+Assassin Token+Aerie Auxiliary+Grizzly Bears | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:1,11,21,25,84,88` | attack Assassin Token+Assassin Token+Aerie Auxiliary+Grizzly Bears+Wyluli Wolf+Spirited Companion | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:11,25,88` | attack Assassin Token+Aerie Auxiliary+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:11,25,84` | attack Assassin Token+Aerie Auxiliary+Grizzly Bears | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 5 | `attack:11,84,88` | attack Assassin Token+Assassin Token+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:25,84,88` | attack Assassin Token+Assassin Token+Aerie Auxiliary | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:11,21,25,84,88` | attack Assassin Token+Assassin Token+Aerie Auxiliary+Grizzly Bears+Wyluli Wolf | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d17** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:26` | Momentary Blink | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d18** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:18` | Tundra Wolves | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d19** (turn 16, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,11,21,25,84,88` | attack Spirited Companion+Assassin Token+Wyluli Wolf+Assassin Token+Aerie Auxiliary+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:11,21,25,84,88` | attack Assassin Token+Wyluli Wolf+Assassin Token+Aerie Auxiliary+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:1,11,21,25,88` | attack Spirited Companion+Wyluli Wolf+Assassin Token+Aerie Auxiliary+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:1,11,25,84,88` | attack Spirited Companion+Assassin Token+Assassin Token+Aerie Auxiliary+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:1,11,21,25,84` | attack Spirited Companion+Assassin Token+Wyluli Wolf+Aerie Auxiliary+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:1,11,21,84,88` | attack Spirited Companion+Assassin Token+Wyluli Wolf+Assassin Token+Grizzly Bears | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:1,21,25,84,88` | attack Spirited Companion+Assassin Token+Wyluli Wolf+Assassin Token+Aerie Auxiliary | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

5245 branch games (7 with an error, left out; 7 of them engine errors, a Java Error such as OutOfMemoryError (D465)); 22 random and 9 Forge branches ended at the turn cap.

## Checks

241225 rows checked (ids against each seat's own frame log), 10492 frame logs through tools/check-redaction.mjs, 5245 forks checked (0 not the position), 23 no-leak checks (0 moved; the negative control moved in 23). The guardrails read back from 9050 random seats' logs: a land offered at 37144 of 427529 priority decisions and taken at 37144; 0 of 0 opening hands kept; G3 left out a repeated no-op 7171 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games that errored

7 of 5245 branch game(s) errored and are left out of their option's value. By error text (ids as #):

| branch games | error |
|---|---|
| 2 | BranchTimeout: the branch's deadline passed inside one engine step (# events into its play) at turn # COMBAT_BEGIN, step # |
| 2 | BranchTimeout: the branch's deadline passed inside one engine step (# events into its play) at turn # COMBAT_DECLARE_ATTACKERS, step # |
| 2 | BranchTimeout: the branch's deadline passed inside one engine step (# events into its play) at turn # MAIN#, step # |
| 1 | BranchTimeout: the branch's deadline passed inside one engine step (# events into its play) at turn # DRAW, step # |

No option had more than 10.0% of its branch games errored.

### Branch games the turn cap ended

31 of 5245 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

