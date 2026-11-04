# Move atlas: peasant-2467-00001 vs peasant-2467-00002, seed 2567

D451. Seat A is peasant-2467-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 14 turns, won by A, and listed 14 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 2 | p | 3 | 2 `cast:14`, 9.7 [1.3, 19.7] (n 150) | -, - (n 0) | - | - |
| d1 | 4 | p | 2 | 0 `cast:14`, 0.0 [0.0, 1.3] (n 150) | -, - (n 0) | - | - |
| d3 | 6 | p | 2 | 0 `cast:17`, 0.0 [0.0, 0.0] (n 150) | -, - (n 0) | - | - |
| d6 | 8 | a | 4 | 0 `attack:14,17`, 0.0 [0.0, 6.3] (n 150) | -, - (n 0) | - | - |
| d7 | 10 | a | 5 | 0 `attack:7,17`, 0.0 [0.0, 12.0] (n 50) | -, - (n 0) | - | - |
| d8 | 11 | b | 2 | 0 `block:none`, 0.0 [0.0, 4.7] (n 150) | -, - (n 0) | - | - |
| d9 | 12 | a | 5 | 0 `attack:7,17`, 0.0 [0.0, 8.0] (n 50) | -, - (n 0) | - | - |
| d10 | 13 | b | 3 | 2 `block:14>44`, 6.0 [0.0, 14.0] (n 150) | -, - (n 0) | - | - |
| d11 | 14 | p | 2 | 0 `cast:10`, 0.0 [0.0, 0.0] (n 50) | -, - (n 0) | - | - |
| d12 | 14 | p | 2 | 0 `activate:14#0`, 0.0 [0.0, 0.7] (n 150) | -, - (n 0) | - | - |
| d13 | 14 | a | 5 | 0 `attack:7,10,17`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 7 of them in full (3 more stopped by the futility rule, D489); picked among those with 3 or more options first (4 filled from the rest). The screen at 25 random branches settled 1: d13 (mean value 98.4%, replaced by d11). Early stopping at 50/100 random branches stopped 2 option(s): d3 o1 at 50, d6 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 5. It stopped 3 (d7, d9, d11), each a partial label at that n, never confident, saving at most 1200 branch games; 2 it would have stopped played on to the full n as controls (d3, d12; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 2, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Gleeful Demolition | 54.0 [46.0, 61.8] (n 150) | - (n 0) |
| 1 | `pass` | pass | 58.7 [50.7, 66.2] (n 150) | - (n 0) |
| 2 | `cast:14` | Rabbit Battery | 63.7 [55.7, 70.9] (n 150) | - (n 0) |

**d1** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:14` | Rabbit Battery | 69.3 [61.6, 76.1] (n 150) | - (n 0) |
| 1 | `pass` | pass | 61.7 [53.7, 69.1] (n 150) | - (n 0) |

**d3** (turn 6, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Spiteful Prankster | 80.3 [73.3, 85.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 65.0 [51.1, 76.7] (n 50, stopped at 50) | - (n 0) |

**d6** (turn 8, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:14,17` | attack Spiteful Prankster+Rabbit Battery | 76.3 [68.9, 82.4] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 43.0 [30.3, 56.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:14` | attack Rabbit Battery | 63.0 [55.0, 70.3] (n 150) | - (n 0) |
| 3 | `attack:17` | attack Spiteful Prankster | 74.0 [66.4, 80.4] (n 150) | - (n 0) |

**d7** (turn 10, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:7,17` | attack Spiteful Prankster+Dancing Scimitar | 78.0 [64.8, 87.3] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 62.0 [48.1, 74.1] (n 50) | - (n 0) |
| 2 | `attack:7,14,17` | attack Spiteful Prankster+Dancing Scimitar+Rabbit Battery | 72.0 [58.3, 82.5] (n 50) | - (n 0) |
| 3 | `attack:7` | attack Dancing Scimitar | 46.0 [33.0, 59.6] (n 50) | - (n 0) |
| 4 | `attack:17` | attack Spiteful Prankster | 66.0 [52.1, 77.6] (n 50) | - (n 0) |

**d8** (turn 11, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 76.7 [69.3, 82.7] (n 150) | - (n 0) |
| 1 | `block:14>52` | block Rabbit Battery>Marionette Apprentice | 72.7 [65.0, 79.2] (n 150) | - (n 0) |

**d9** (turn 12, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:7,17` | attack Spiteful Prankster+Dancing Scimitar | 92.0 [81.2, 96.9] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 84.0 [71.5, 91.7] (n 50) | - (n 0) |
| 2 | `attack:7,14,17` | attack Spiteful Prankster+Dancing Scimitar+Rabbit Battery | 88.0 [76.2, 94.4] (n 50) | - (n 0) |
| 3 | `attack:7` | attack Dancing Scimitar | 82.0 [69.2, 90.2] (n 50) | - (n 0) |
| 4 | `attack:17` | attack Spiteful Prankster | 86.0 [73.8, 93.0] (n 50) | - (n 0) |

**d10** (turn 13, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 82.7 [75.8, 87.9] (n 150) | - (n 0) |
| 1 | `block:14>52` | block Rabbit Battery>Marionette Apprentice | 80.0 [72.9, 85.6] (n 150) | - (n 0) |
| 2 | `block:14>44` | block Rabbit Battery>Dauntless Scrapbot | 88.7 [82.6, 92.8] (n 150) | - (n 0) |

**d11** (turn 14, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:10` | Ivora, Insatiable Heir | 100.0 [92.9, 100.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 88.0 [76.2, 94.4] (n 50) | - (n 0) |

**d12** (turn 14, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:14#0` | Rabbit Battery: Reconfigure {R}: Attach | 96.7 [92.4, 98.6] (n 150) | - (n 0) |
| 1 | `pass` | pass | 93.3 [88.2, 96.3] (n 150) | - (n 0) |

**d13** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.4%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:7,10,17` | attack Spiteful Prankster+Dancing Scimitar+Ivora, Insatiable Heir | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `attack:7,10` | attack Dancing Scimitar+Ivora, Insatiable Heir | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 3 | `attack:10,17` | attack Spiteful Prankster+Ivora, Insatiable Heir | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:7,17` | attack Spiteful Prankster+Dancing Scimitar | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

3225 branch games (0 with an error, left out); 13 random and 0 Forge branches ended at the turn cap.

## Checks

105673 rows checked (ids against each seat's own frame log), 6452 frame logs through tools/check-redaction.mjs, 3225 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 11). The guardrails read back from 6450 random seats' logs: a land offered at 22458 of 158898 priority decisions and taken at 22458; 0 of 0 opening hands kept; G3 left out a repeated no-op 2085 time(s); G5 (D458): the engine refused 227 pick(s) it could not pay for, and 192 later offer(s) of them in the same priority window were left out; G6 (D471): 306 pick(s) of the seats' own X plays had X drawn from 1 up, 1265 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

13 of 3225 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

