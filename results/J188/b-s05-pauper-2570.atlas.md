# Move atlas: pauper-2470-00001 vs pauper-2470-00002, seed 2570

D451. Seat A is pauper-2470-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 17 turns, won by A, and listed 22 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 5 | p | 4 | 3 `cast:14`, 3.0 [0.0, 13.3] (n 150) | -, - (n 0) | - | - |
| d5 | 7 | p | 6 | 2 `cast:5`, 8.0 [0.0, 18.0] (n 150) | -, - (n 0) | - | - |
| d7 | 7 | p | 6 | 2 `cast:16`, 3.3 [0.0, 16.0] (n 150) | -, - (n 0) | - | - |
| d10 | 9 | p | 3 | 0 `cast:18`, 0.0 [0.0, 11.0] (n 150) | -, - (n 0) | - | - |
| d12 | 11 | a | 3 | 0 `attack:17`, 0.0 [0.0, 7.3] (n 150) | -, - (n 0) | - | - |
| d14 | 13 | p | 4 | 0 `activate:25`, 0.0 [0.0, 12.0] (n 50) | -, - (n 0) | - | - |
| d15 | 13 | p | 3 | 0 `cast:12`, 0.0 [0.0, 20.0] (n 50) | -, - (n 0) | - | - |
| d19 | 15 | p | 4 | 3 `cast:14`, 4.0 [0.0, 14.7] (n 150) | -, - (n 0) | - | - |
| d20 | 17 | p | 6 | 0 `cast:31`, 0.0 [0.0, 8.0] (n 150) | -, - (n 0) | - | - |
| d21 | 17 | a | 4 | 0 `attack:16,17`, 0.0 [0.0, 0.0] (n 150) | -, - (n 0) | - | - |

### The cut design (D480)

10 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100 random branches stopped 13 option(s): d5 o4 at 50, d5 o5 at 50, d7 o3 at 50, d7 o4 at 100, d12 o1 at 50, d19 o1 at 50, d20 o1 at 50, d20 o2 at 50, d20 o3 at 50, d20 o5 at 50, d21 o1 at 100, d21 o2 at 50, d21 o3 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 2 (d14, d15), each a partial label at that n, never confident, saving at most 700 branch games; 1 it would have stopped played on to the full n as controls (d21; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:40#0` | Tranquil Landscape: {T}, Sacrifice CARDNAME: Search your lib | 44.7 [36.9, 52.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 38.7 [31.3, 46.7] (n 150) | - (n 0) |
| 2 | `cast:5` | Gloom | 43.3 [35.7, 51.3] (n 150) | - (n 0) |
| 3 | `cast:14` | Village Rites | 47.7 [39.8, 55.6] (n 150) | - (n 0) |

**d5** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 37.3 [30.0, 45.3] (n 150) | - (n 0) |
| 1 | `cast:16` | Tundra Wolves | 39.0 [31.6, 47.0] (n 150) | - (n 0) |
| 2 | `cast:5` | Gloom | 45.3 [37.6, 53.3] (n 150) | - (n 0) |
| 3 | `cast:14` | Village Rites | 38.7 [31.3, 46.7] (n 150) | - (n 0) |
| 4 | `cast:27` | Circle of Protection: Blue | 26.0 [15.9, 39.6] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:18` | Unwilling Ingredient | 24.0 [14.3, 37.4] (n 50, stopped at 50) | - (n 0) |

**d7** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Gloom | 40.7 [33.1, 48.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 42.7 [35.0, 50.7] (n 150) | - (n 0) |
| 2 | `cast:16` | Tundra Wolves | 44.0 [36.3, 52.0] (n 150) | - (n 0) |
| 3 | `cast:27` | Circle of Protection: Blue | 29.0 [18.3, 42.7] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:18` | Unwilling Ingredient | 33.0 [24.6, 42.7] (n 100, stopped at 100) | - (n 0) |
| 5 | `cast:14` | Village Rites | 44.0 [36.3, 52.0] (n 150) | - (n 0) |

**d10** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Unwilling Ingredient | 49.0 [41.1, 56.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 48.3 [40.5, 56.3] (n 150) | - (n 0) |
| 2 | `cast:14` | Village Rites | 48.7 [40.8, 56.6] (n 150) | - (n 0) |

**d12** (turn 11, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:17` | attack Nezumi Road Captain | 51.3 [43.4, 59.2] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 43.0 [30.3, 56.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:17,18` | attack Nezumi Road Captain+Unwilling Ingredient | 49.0 [41.1, 56.9] (n 150) | - (n 0) |

**d14** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:25` | Evolving Wilds: {T}, Sacrifice CARDNAME: Search your library | 54.0 [40.4, 67.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 40.0 [27.6, 53.8] (n 50) | - (n 0) |
| 2 | `cast:12` | Unholy Strength | 46.0 [33.0, 59.6] (n 50) | - (n 0) |
| 3 | `cast:14` | Village Rites | 46.0 [33.0, 59.6] (n 50) | - (n 0) |

**d15** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:12` | Unholy Strength | 42.0 [29.4, 55.8] (n 50) | - (n 0) |
| 1 | `pass` | pass | 36.0 [24.1, 49.9] (n 50) | - (n 0) |
| 2 | `cast:14` | Village Rites | 42.0 [29.4, 55.8] (n 50) | - (n 0) |

**d19** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:16` | Tundra Wolves | 61.3 [53.3, 68.8] (n 150) | - (n 0) |
| 1 | `pass` | pass | 48.0 [34.8, 61.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:19` | Blood Fountain | 60.0 [52.0, 67.5] (n 150) | - (n 0) |
| 3 | `cast:14` | Village Rites | 65.3 [57.4, 72.5] (n 150) | - (n 0) |

**d20** (turn 17, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:31` | Gonti, Lord of Luxury | 81.3 [74.3, 86.8] (n 150) | - (n 0) |
| 1 | `pass` | pass | 56.0 [42.3, 68.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:14` | Village Rites | 62.0 [48.1, 74.1] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:27` | Circle of Protection: Blue | 63.0 [49.1, 75.0] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:34` | Seeker of the Way | 80.7 [73.6, 86.2] (n 150) | - (n 0) |
| 5 | `cast:19` | Blood Fountain | 66.0 [52.1, 77.6] (n 50, stopped at 50) | - (n 0) |

**d21** (turn 17, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:16,17` | attack Tundra Wolves+Nezumi Road Captain | 95.3 [90.7, 97.7] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 78.0 [68.9, 85.0] (n 100, stopped at 100) | - (n 0) |
| 2 | `attack:17` | attack Nezumi Road Captain | 84.0 [71.5, 91.7] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:16` | attack Tundra Wolves | 81.0 [72.2, 87.5] (n 100, stopped at 100) | - (n 0) |

4600 branch games (0 with an error, left out); 8 random and 0 Forge branches ended at the turn cap.

## Checks

206123 rows checked (ids against each seat's own frame log), 9202 frame logs through tools/check-redaction.mjs, 4600 forks checked (0 not the position), 10 no-leak checks (0 moved; the negative control moved in 10). The guardrails read back from 9200 random seats' logs: a land offered at 45441 of 647121 priority decisions and taken at 45441; 0 of 0 opening hands kept; G3 left out a repeated no-op 994 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 4474 pick(s) of the seats' own X plays had X drawn from 1 up, 90619 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

8 of 4600 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

