# Move atlas: peasant-2818-00001 vs peasant-2818-00002, seed 2918

D451. Seat A is peasant-2818-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 16 turns, won by B, and listed 20 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 3 | p | 3 | 1 `cast:1`, 5.7 [0.0, 13.3] (n 150) | -, - (n 0) | - | - |
| d1 | 3 | p | 3 | 2 `cast:38`, 1.7 [0.0, 10.3] (n 150) | -, - (n 0) | - | - |
| d3 | 5 | p | 4 | 0 `cast:2`, 0.0 [0.0, 15.0] (n 50) | -, - (n 0) | - | - |
| d4 | 7 | p | 5 | 1 `pass`, 1.7 [0.0, 9.7] (n 150) | -, - (n 0) | - | - |
| d7 | 9 | a | 6 | 1 `attack:2,82,83,84`, 10.3 [1.3, 20.0] (n 150) | -, - (n 0) | - | - |
| d8 | 9 | p | 4 | 0 `cast:7`, 0.0 [0.0, 12.0] (n 50) | -, - (n 0) | - | - |
| d13 | 13 | p | 3 | 1 `pass`, 1.3 [0.0, 12.3] (n 150) | -, - (n 0) | - | - |
| d15 | 13 | a | 7 | 2 `attack:2,7,82,83,84`, 5.3 [0.0, 14.0] (n 150) | -, - (n 0) | - | - |
| d18 | 15 | p | 3 | 0 `cast:3`, 0.0 [0.0, 0.0] (n 150) | -, - (n 0) | - | - |
| d19 | 15 | a | 7 | 2 `attack:2,7,82,83,84`, 14.3 [9.0, 20.0] (n 150) | -, - (n 0) | - | - |

### The cut design (D480)

10 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100 random branches stopped 9 option(s): d0 o2 at 50, d15 o1 at 50, d18 o1 at 50, d18 o2 at 50, d19 o1 at 50, d19 o3 at 100, d19 o4 at 50, d19 o5 at 50, d19 o6 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 2 (d3, d8), each a partial label at that n, never confident, saving at most 800 branch games; 1 it would have stopped played on to the full n as controls (d18; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 77.3 [70.0, 83.3] (n 150) | - (n 0) |
| 1 | `cast:1` | Path to the World Tree | 83.0 [76.2, 88.2] (n 150) | - (n 0) |
| 2 | `cast:38` | Lifeforce | 74.0 [60.5, 84.1] (n 50, stopped at 50) | - (n 0) |

**d1** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Path to the World Tree | 76.7 [69.3, 82.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 72.3 [64.7, 78.9] (n 150) | - (n 0) |
| 2 | `cast:38` | Lifeforce | 78.3 [71.1, 84.2] (n 150) | - (n 0) |

**d3** (turn 5, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:2` | Kitchen Finks | 79.0 [65.9, 88.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 59.0 [45.2, 71.5] (n 50) | - (n 0) |
| 2 | `cast:38` | Lifeforce | 78.0 [64.8, 87.3] (n 50) | - (n 0) |
| 3 | `cast:4` | Scryb Sprites | 79.0 [65.9, 88.0] (n 50) | - (n 0) |

**d4** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | The Last Ronin's Technique | 79.7 [72.5, 85.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 81.3 [74.3, 86.8] (n 150) | - (n 0) |
| 2 | `cast:38` | Lifeforce | 74.3 [66.8, 80.7] (n 150) | - (n 0) |
| 3 | `cast:7` | Polukranos, World Eater | 75.3 [67.9, 81.5] (n 150) | - (n 0) |
| 4 | `cast:4` | Scryb Sprites | 75.7 [68.2, 81.8] (n 150) | - (n 0) |

**d7** (turn 9, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 60.3 [52.3, 67.8] (n 150) | - (n 0) |
| 1 | `attack:2,82,83,84` | attack Kitchen Finks+Ninja Turtle Spirit Token+Ninja Turtle Spirit Token+Ninja Turtle Spirit Token | 70.7 [62.9, 77.4] (n 150) | - (n 0) |
| 2 | `attack:2` | attack Kitchen Finks | 65.7 [57.8, 72.8] (n 150) | - (n 0) |
| 3 | `attack:82` | attack Ninja Turtle Spirit Token | 60.3 [52.3, 67.8] (n 150) | - (n 0) |
| 4 | `attack:83` | attack Ninja Turtle Spirit Token | 60.3 [52.3, 67.8] (n 150) | - (n 0) |
| 5 | `attack:84` | attack Ninja Turtle Spirit Token | 61.7 [53.7, 69.1] (n 150) | - (n 0) |

**d8** (turn 9, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:7` | Polukranos, World Eater | 69.0 [55.2, 80.1] (n 50) | - (n 0) |
| 1 | `pass` | pass | 49.0 [35.7, 62.4] (n 50) | - (n 0) |
| 2 | `cast:38` | Lifeforce | 55.0 [41.3, 67.9] (n 50) | - (n 0) |
| 3 | `cast:4` | Scryb Sprites | 66.0 [52.1, 77.6] (n 50) | - (n 0) |

**d13** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:35` | Instill Energy | 66.3 [58.5, 73.4] (n 150) | - (n 0) |
| 1 | `pass` | pass | 67.7 [59.8, 74.6] (n 150) | - (n 0) |
| 2 | `cast:38` | Lifeforce | 67.0 [59.1, 74.0] (n 150) | - (n 0) |

**d15** (turn 13, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:7` | attack Polukranos, World Eater | 76.0 [68.6, 82.1] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 60.0 [46.2, 72.4] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:2,7,82,83,84` | attack Polukranos, World Eater+Kitchen Finks+Ninja Turtle Spirit Token+Ninja Turtle Spirit Token+Ninja Turtle Spirit Token | 81.3 [74.3, 86.8] (n 150) | - (n 0) |
| 3 | `attack:2,7` | attack Polukranos, World Eater+Kitchen Finks | 78.7 [71.4, 84.5] (n 150) | - (n 0) |
| 4 | `attack:7,82` | attack Polukranos, World Eater+Ninja Turtle Spirit Token | 76.0 [68.6, 82.1] (n 150) | - (n 0) |
| 5 | `attack:7,83` | attack Polukranos, World Eater+Ninja Turtle Spirit Token | 76.0 [68.6, 82.1] (n 150) | - (n 0) |
| 6 | `attack:7,84` | attack Polukranos, World Eater+Ninja Turtle Spirit Token | 76.0 [68.6, 82.1] (n 150) | - (n 0) |

**d18** (turn 15, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Snarl Song | 84.3 [77.7, 89.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:4` | Scryb Sprites | 58.0 [44.2, 70.6] (n 50, stopped at 50) | - (n 0) |

**d19** (turn 15, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:7` | attack Polukranos, World Eater | 85.7 [79.2, 90.4] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 61.0 [47.2, 73.3] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:2,7,82,83,84` | attack Polukranos, World Eater+Kitchen Finks+Ninja Turtle Spirit Token+Ninja Turtle Spirit Token+Ninja Turtle Spirit Token | 100.0 [97.5, 100.0] (n 150) | - (n 0) |
| 3 | `attack:2,7` | attack Polukranos, World Eater+Kitchen Finks | 95.0 [88.8, 97.9] (n 100, stopped at 100) | - (n 0) |
| 4 | `attack:7,82` | attack Polukranos, World Eater+Ninja Turtle Spirit Token | 88.0 [76.2, 94.4] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:7,83` | attack Polukranos, World Eater+Ninja Turtle Spirit Token | 88.0 [76.2, 94.4] (n 50, stopped at 50) | - (n 0) |
| 6 | `attack:7,84` | attack Polukranos, World Eater+Ninja Turtle Spirit Token | 88.0 [76.2, 94.4] (n 50, stopped at 50) | - (n 0) |

5100 branch games (0 with an error, left out); 39 random and 0 Forge branches ended at the turn cap.

## Checks

162461 rows checked (ids against each seat's own frame log), 10202 frame logs through tools/check-redaction.mjs, 5100 forks checked (0 not the position), 10 no-leak checks (0 moved; the negative control moved in 10). The guardrails read back from 10200 random seats' logs: a land offered at 32392 of 529670 priority decisions and taken at 32392; 0 of 0 opening hands kept; G3 left out a repeated no-op 4878 time(s); G5 (D458): the engine refused 461 pick(s) it could not pay for, and 392 later offer(s) of them in the same priority window were left out; G6 (D471): 23357 pick(s) of the seats' own X plays had X drawn from 1 up, 417818 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

39 of 5100 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

