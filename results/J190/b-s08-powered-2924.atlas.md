# Move atlas: powered-2824-00001 vs powered-2824-00002, seed 2924

D451. Seat A is powered-2824-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 15 turns, won by A, and listed 12 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 7 | p | 4 | 3 `cast:1`, 9.0 [3.0, 17.7] (n 150) | -, - (n 0) | - | - |
| d1 | 9 | p | 4 | 2 `cast:32`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d2 | 9 | a | 2 | 1 `attack:none`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d3 | 9 | p | 3 | 1 `pass`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d4 | 11 | p | 4 | 1 `cast:2`, 12.8 [5.4, 20.8] (n 149) | -, - (n 0) | - | - |
| d5 | 11 | a | 4 | 0 `attack:none`, 0.0 [0.0, 7.5] (n 150) | -, - (n 0) | - | - |
| d6 | 11 | p | 3 | 0 `cast:2`, 0.0 [0.0, 4.0] (n 50) | -, - (n 0) | - | - |
| d7 | 13 | p | 4 | 0 `cast:36`, 0.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d8 | 13 | p | 2 | 1 `pass`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d9 | 13 | a | 4 | 0 `attack:1,8`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d10 | 15 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d11 | 15 | a | 4 | 0 `attack:1,8`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

12 decision(s) branched, 3 of them in full (1 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 8: d1 (mean value 97.0%, nothing left to replace it), d3 (mean value 98.7%, replaced by d8), d7 (mean value 96.0%, nothing left to replace it), d9 (mean value 96.0%, nothing left to replace it), d10 (mean value 100.0%, nothing left to replace it), d11 (mean value 100.0%, nothing left to replace it), d8 (mean value 98.0%, replaced by d2), d2 (mean value 98.0%, nothing left to replace it). Early stopping at 50/100 random branches stopped 3 option(s): d4 o2 at 100, d4 o3 at 100, d5 o2 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 4 decision(s) at 50 random branches: option 0 the best or within 0 of it at 2. It stopped 1 (d6), each a partial label at that n, never confident, saving at most 300 branch games; 1 it would have stopped played on to the full n as controls (d5; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:7` | Noble Hierarch | 80.3 [73.3, 85.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 87.3 [81.1, 91.7] (n 150) | - (n 0) |
| 2 | `cast:32` | Wicked Wolf | 88.7 [82.6, 92.8] (n 150) | - (n 0) |
| 3 | `cast:1` | Ouroboroid | 89.3 [83.4, 93.3] (n 150) | - (n 0) |

**d1** (turn 9, p; option 0 is Forge's answer) -- settled by the screen (mean value 97.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `cast:2` | Natural Order | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `cast:32` | Wicked Wolf | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:1` | Ouroboroid | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d2** (turn 9, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:7` | attack Noble Hierarch | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d3** (turn 9, p; option 0 is Forge's answer) -- settled by the screen (mean value 98.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Ouroboroid | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:2` | Natural Order | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d4** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 78.5 [71.3, 84.4] (n 149) | - (n 0) |
| 1 | `cast:2` | Natural Order | 91.3 [85.7, 94.8] (n 149) | - (n 0) |
| 2 | `cast:32` | Wicked Wolf | 77.8 [68.6, 84.8] (n 99, stopped at 100) | - (n 0) |
| 3 | `cast:4` | Dragonbroods' Relic | 74.8 [65.4, 82.3] (n 99, stopped at 100) | - (n 0) |

**d5** (turn 11, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 81.7 [74.7, 87.0] (n 150) | - (n 0) |
| 1 | `attack:1,7` | attack Noble Hierarch+Ouroboroid | 78.0 [70.7, 83.9] (n 150) | - (n 0) |
| 2 | `attack:7` | attack Noble Hierarch | 73.5 [64.1, 81.2] (n 100, stopped at 100) | - (n 0) |
| 3 | `attack:1` | attack Ouroboroid | 81.3 [74.3, 86.8] (n 150) | - (n 0) |

**d6** (turn 11, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:2` | Natural Order | 86.0 [73.8, 93.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 67.0 [53.2, 78.4] (n 50) | - (n 0) |
| 2 | `cast:4` | Dragonbroods' Relic | 78.0 [64.8, 87.3] (n 50) | - (n 0) |

**d7** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:36` | Grafted Wargear | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `cast:32` | Wicked Wolf | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 3 | `cast:4` | Dragonbroods' Relic | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d8** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:36` | Grafted Wargear: Equip {0} ({0}: Attach to target creature y | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d9** (turn 13, a; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,8` | attack Ouroboroid+Worldspine Wurm | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 90.0 [72.5, 96.9] (n 25) | - (n 0) |
| 2 | `attack:8` | attack Worldspine Wurm | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:1` | attack Ouroboroid | 94.0 [77.7, 98.6] (n 25) | - (n 0) |

**d10** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:32` | Wicked Wolf | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:4` | Dragonbroods' Relic | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d11** (turn 15, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,8` | attack Ouroboroid+Worldspine Wurm | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:8` | attack Worldspine Wurm | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:1` | attack Ouroboroid | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

2450 branch games (1 with an error, left out; 1 of them engine errors, a Java Error such as OutOfMemoryError (D465)); 6 random and 0 Forge branches ended at the turn cap.

## Checks

54993 rows checked (ids against each seat's own frame log), 4902 frame logs through tools/check-redaction.mjs, 2450 forks checked (0 not the position), 12 no-leak checks (0 moved; the negative control moved in 12). The guardrails read back from 4900 random seats' logs: a land offered at 13613 of 86251 priority decisions and taken at 13613; 0 of 0 opening hands kept; G3 left out a repeated no-op 1126 time(s); G5 (D458): the engine refused 33 pick(s) it could not pay for, and 17 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games that errored

1 of 2450 branch game(s) errored and are left out of their option's value. By error text (ids as #):

| branch games | error |
|---|---|
| 1 | BranchTimeout: the branch's deadline passed inside one engine step (# events into its play) at turn # MAIN#, step # |

No option had more than 10.0% of its branch games errored.

### Branch games the turn cap ended

6 of 2450 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

