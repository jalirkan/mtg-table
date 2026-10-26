# Move atlas: legacy-2003-00001 vs legacy-2003-00002, seed 2103

D451. Seat A is legacy-2003-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 28 turns, won by A, and listed 22 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 6 | p | 3 | 1 `cast:38`, 13.0 [4.3, 22.3] (n 200) | -, - (n 0) | - | - |
| d7 | 18 | p | 3 | 0 `pass`, 0.0 [0.0, 0.5] (n 200) | -, - (n 0) | - | - |
| d9 | 20 | p | 3 | 1 `cast:19`, 3.3 [0.0, 10.3] (n 200) | -, - (n 0) | - | - |
| d11 | 22 | p | 3 | 0 `pass`, 0.0 [0.0, 6.5] (n 200) | -, - (n 0) | - | - |
| d15 | 26 | p | 5 | 1 `cast:29`, 21.8 [13.8, 28.8] (n 200) | -, - (n 0) | - | - |
| d18 | 28 | p | 4 | 0 `cast:23`, 0.0 [0.0, 1.8] (n 200) | -, - (n 0) | - | - |
| d19 | 28 | p | 4 | 2 `cast:19`, 2.8 [0.0, 7.0] (n 200) | -, - (n 0) | - | - |
| d21 | 28 | a | 8 | 0 `attack:29,31,108,109,110,114`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |

### The cut design (D480)

8 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100/150 random branches stopped 4 option(s): d15 o2 at 50, d18 o1 at 50, d21 o1 at 50, d21 o2 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 53.3 [46.3, 60.0] (n 200) | - (n 0) |
| 1 | `cast:38` | Springheart Nantuko | 66.3 [59.5, 72.4] (n 200) | - (n 0) |
| 2 | `cast:11` | Zirda, the Dawnwaker | 62.0 [55.1, 68.4] (n 200) | - (n 0) |

**d7** (turn 18, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 28.2 [22.5, 34.8] (n 200) | - (n 0) |
| 1 | `cast:19` | Murderous Rider | 21.5 [16.4, 27.7] (n 200) | - (n 0) |
| 2 | `cast:19` | Murderous Rider | 21.5 [16.4, 27.7] (n 200) | - (n 0) |

**d9** (turn 20, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 27.3 [21.6, 33.8] (n 200) | - (n 0) |
| 1 | `cast:19` | Murderous Rider | 30.5 [24.5, 37.2] (n 200) | - (n 0) |
| 2 | `cast:19` | Murderous Rider | 30.5 [24.5, 37.2] (n 200) | - (n 0) |

**d11** (turn 22, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 28.7 [22.9, 35.4] (n 200) | - (n 0) |
| 1 | `cast:19` | Murderous Rider | 27.8 [22.0, 34.3] (n 200) | - (n 0) |
| 2 | `cast:19` | Murderous Rider | 27.8 [22.0, 34.3] (n 200) | - (n 0) |

**d15** (turn 26, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 56.0 [49.1, 62.7] (n 200) | - (n 0) |
| 1 | `cast:29` | Hornet Queen | 77.8 [71.5, 83.0] (n 200) | - (n 0) |
| 2 | `cast:23` | Minsc & Boo, Timeless Heroes | 58.0 [44.2, 70.6] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:19` | Murderous Rider | 69.5 [62.8, 75.5] (n 200) | - (n 0) |
| 4 | `cast:19` | Murderous Rider | 69.5 [62.8, 75.5] (n 200) | - (n 0) |

**d18** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:23` | Minsc & Boo, Timeless Heroes | 93.5 [89.2, 96.2] (n 200) | - (n 0) |
| 1 | `pass` | pass | 82.0 [69.2, 90.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:19` | Murderous Rider | 90.8 [85.9, 94.0] (n 200) | - (n 0) |
| 3 | `cast:19` | Murderous Rider | 90.8 [85.9, 94.0] (n 200) | - (n 0) |

**d19** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:23#0` | Minsc & Boo, Timeless Heroes: +1: Put three +1/+1 counters o | 91.3 [86.5, 94.4] (n 200) | - (n 0) |
| 1 | `pass` | pass | 87.8 [82.5, 91.6] (n 200) | - (n 0) |
| 2 | `cast:19` | Murderous Rider | 94.0 [89.8, 96.5] (n 200) | - (n 0) |
| 3 | `cast:19` | Murderous Rider | 94.0 [89.8, 96.5] (n 200) | - (n 0) |

**d21** (turn 28, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:29,31,108,109,110,114` | attack Boo+Insect Token+Hornet Queen+Insect Token+Insect Token+Restless Vents | 100.0 [98.1, 100.0] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 77.0 [63.7, 86.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:29,31,108,109,110` | attack Insect Token+Hornet Queen+Insect Token+Insect Token+Restless Vents | 93.0 [82.5, 97.4] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:29,31,109,110,114` | attack Boo+Hornet Queen+Insect Token+Insect Token+Restless Vents | 99.5 [97.2, 99.9] (n 200) | - (n 0) |
| 4 | `attack:31,108,109,110,114` | attack Boo+Insect Token+Insect Token+Insect Token+Restless Vents | 100.0 [98.1, 100.0] (n 200) | - (n 0) |
| 5 | `attack:29,31,108,110,114` | attack Boo+Insect Token+Hornet Queen+Insect Token+Restless Vents | 99.5 [97.2, 99.9] (n 200) | - (n 0) |
| 6 | `attack:29,31,108,109,114` | attack Boo+Insect Token+Hornet Queen+Insect Token+Restless Vents | 99.5 [97.2, 99.9] (n 200) | - (n 0) |
| 7 | `attack:29,108,109,110,114` | attack Boo+Insect Token+Hornet Queen+Insect Token+Insect Token | 99.0 [96.4, 99.7] (n 200) | - (n 0) |

6000 branch games (0 with an error, left out); 283 random and 0 Forge branches ended at the turn cap.

## Checks

101337 rows checked (ids against each seat's own frame log), 12002 frame logs through tools/check-redaction.mjs, 6000 forks checked (0 not the position), 8 no-leak checks (0 moved; the negative control moved in 8). The guardrails read back from 12000 random seats' logs: a land offered at 27037 of 371206 priority decisions and taken at 27037; 0 of 0 opening hands kept; G3 left out a repeated no-op 215 time(s); G5 (D458): the engine refused 47 pick(s) it could not pay for, and 48 later offer(s) of them in the same priority window were left out; G6 (D471): 1491 pick(s) of the seats' own X plays had X drawn from 1 up, 118213 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

283 of 6000 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

