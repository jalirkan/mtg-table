# Move atlas: legacy-2468-00001 vs legacy-2468-00002, seed 2568

D451. Seat A is legacy-2468-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 16 turns, won by B, and listed 17 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 7 | p | 3 | 1 `cast:12`, 1.0 [0.0, 9.7] (n 150) | -, - (n 0) | - | - |
| d1 | 7 | p | 3 | 0 `cast:21`, 0.0 [0.0, 13.0] (n 50) | -, - (n 0) | - | - |
| d3 | 9 | p | 3 | 0 `cast:17`, 0.0 [0.0, 16.0] (n 50) | -, - (n 0) | - | - |
| d5 | 11 | p | 3 | 0 `pass`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d6 | 11 | p | 3 | 2 `cast:12`, 0.3 [0.0, 9.0] (n 150) | -, - (n 0) | - | - |
| d8 | 13 | p | 4 | 0 `cast:11`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d9 | 13 | a | 4 | 0 `attack:11,21`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d11 | 15 | p | 4 | 2 `cast:12`, 4.0 [0.0, 14.0] (n 150) | -, - (n 0) | - | - |
| d12 | 15 | p | 4 | 0 `activate:96`, 0.0 [0.0, 12.0] (n 50) | -, - (n 0) | - | - |
| d14 | 15 | a | 4 | 1 `attack:11,21`, 79.3 [72.7, 85.3] (n 150) | -, - (n 0) | - | - |
| d16 | 16 | b | 5 | 0 `block:11>59,23>68,21>104`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 4 of them in full (6 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 1: d16 (mean value 0.0%, replaced by d8). Early stopping at 50/100 random branches stopped 4 option(s): d6 o1 at 100, d11 o3 at 50, d14 o2 at 50, d14 o3 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 7. It stopped 6 (d1, d3, d5, d9, d12, d8), each a partial label at that n, never confident, saving at most 2100 branch games; 1 it would have stopped played on to the full n as controls (d6; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 82.7 [75.8, 87.9] (n 150) | - (n 0) |
| 1 | `cast:12` | Spinner of Souls | 83.7 [76.9, 88.7] (n 150) | - (n 0) |
| 2 | `cast:21` | Sentinel of the Nameless City | 81.3 [74.3, 86.8] (n 150) | - (n 0) |

**d1** (turn 7, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Sentinel of the Nameless City | 82.0 [69.2, 90.2] (n 50) | - (n 0) |
| 1 | `pass` | pass | 75.0 [61.5, 84.9] (n 50) | - (n 0) |
| 2 | `cast:12` | Spinner of Souls | 81.0 [68.1, 89.5] (n 50) | - (n 0) |

**d3** (turn 9, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Primal Might | 78.0 [64.8, 87.3] (n 50) | - (n 0) |
| 1 | `pass` | pass | 78.0 [64.8, 87.3] (n 50) | - (n 0) |
| 2 | `cast:12` | Spinner of Souls | 76.0 [62.6, 85.7] (n 50) | - (n 0) |

**d5** (turn 11, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 34.0 [22.4, 47.9] (n 50) | - (n 0) |
| 1 | `cast:12` | Spinner of Souls | 26.0 [15.9, 39.6] (n 50) | - (n 0) |
| 2 | `cast:21` | Sentinel of the Nameless City | 20.0 [11.2, 33.0] (n 50) | - (n 0) |

**d6** (turn 11, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Sentinel of the Nameless City | 26.7 [20.2, 34.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 15.5 [9.7, 23.8] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:12` | Spinner of Souls | 27.0 [20.5, 34.6] (n 150) | - (n 0) |

**d8** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Vengevine | 18.0 [9.8, 30.8] (n 50) | - (n 0) |
| 1 | `pass` | pass | 10.0 [4.3, 21.4] (n 50) | - (n 0) |
| 2 | `activate:93` | Map Token: {1}, {T}, Sacrifice this token: Target creature y | 12.0 [5.6, 23.8] (n 50) | - (n 0) |
| 3 | `cast:12` | Spinner of Souls | 18.0 [9.8, 30.8] (n 50) | - (n 0) |

**d9** (turn 13, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:11,21` | attack Sentinel of the Nameless City+Vengevine | 22.0 [12.8, 35.2] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 20.0 [11.2, 33.0] (n 50) | - (n 0) |
| 2 | `attack:11` | attack Vengevine | 16.0 [8.3, 28.5] (n 50) | - (n 0) |
| 3 | `attack:21` | attack Sentinel of the Nameless City | 14.0 [7.0, 26.2] (n 50) | - (n 0) |

**d11** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:93` | Map Token: {1}, {T}, Sacrifice this token: Target creature y | 37.3 [30.0, 45.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 36.7 [29.4, 44.6] (n 150) | - (n 0) |
| 2 | `cast:12` | Spinner of Souls | 41.3 [33.8, 49.3] (n 150) | - (n 0) |
| 3 | `cast:23` | Delighted Halfling | 22.0 [12.8, 35.2] (n 50, stopped at 50) | - (n 0) |

**d12** (turn 15, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:96` | Map Token: {1}, {T}, Sacrifice this token: Target creature y | 46.0 [33.0, 59.6] (n 50) | - (n 0) |
| 1 | `pass` | pass | 36.0 [24.1, 49.9] (n 50) | - (n 0) |
| 2 | `cast:12` | Spinner of Souls | 40.0 [27.6, 53.8] (n 50) | - (n 0) |
| 3 | `cast:23` | Delighted Halfling | 40.0 [27.6, 53.8] (n 50) | - (n 0) |

**d14** (turn 15, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 4.7 [2.3, 9.3] (n 150) | - (n 0) |
| 1 | `attack:11,21` | attack Sentinel of the Nameless City+Vengevine | 84.0 [77.3, 89.0] (n 150) | - (n 0) |
| 2 | `attack:21` | attack Sentinel of the Nameless City | 30.0 [19.1, 43.8] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:11` | attack Vengevine | 22.0 [12.8, 35.2] (n 50, stopped at 50) | - (n 0) |

**d16** (turn 16, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:11>59,23>68,21>104` | block Delighted Halfling>Solemn Simulacrum, Sentinel of the Nameless City>Goblin Token, Vengevine>Legion Warboss | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:11>59,21>104` | block Sentinel of the Nameless City>Goblin Token, Vengevine>Legion Warboss | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:11>59,23>68` | block Delighted Halfling>Solemn Simulacrum, Vengevine>Legion Warboss | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:23>68,21>104` | block Delighted Halfling>Solemn Simulacrum, Sentinel of the Nameless City>Goblin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

2925 branch games (0 with an error, left out); 15 random and 0 Forge branches ended at the turn cap.

## Checks

64721 rows checked (ids against each seat's own frame log), 5852 frame logs through tools/check-redaction.mjs, 2925 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 11). The guardrails read back from 5850 random seats' logs: a land offered at 13124 of 115131 priority decisions and taken at 13124; 0 of 0 opening hands kept; G3 left out a repeated no-op 2368 time(s); G5 (D458): the engine refused 1 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 792 pick(s) of the seats' own X plays had X drawn from 1 up, 16842 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

15 of 2925 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

