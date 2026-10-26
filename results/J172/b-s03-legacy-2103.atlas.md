# Move atlas: legacy-2003-00001 vs legacy-2003-00002, seed 2103

D451. Seat A is legacy-2003-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 28 turns, won by A, and listed 22 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 6 | p | 3 | 0 `pass`, 0.0 [0.0, 6.8] (n 200) | -, - (n 0) | - | - |
| d1 | 6 | p | 3 | 1 `pass`, 4.3 [0.0, 12.3] (n 200) | -, - (n 0) | - | - |
| d10 | 20 | a | 4 | 2 `attack:31`, 1.8 [0.0, 8.5] (n 200) | -, - (n 0) | - | - |
| d15 | 26 | p | 4 | 1 `cast:29`, 21.0 [14.7, 28.2] (n 200) | -, - (n 0) | - | - |
| d17 | 26 | p | 3 | 0 `cast:29`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |
| d18 | 28 | p | 3 | 2 `cast:19`, 3.3 [0.0, 7.5] (n 200) | -, - (n 0) | - | - |
| d19 | 28 | p | 3 | 2 `cast:19`, 2.0 [0.0, 5.3] (n 200) | -, - (n 0) | - | - |
| d20 | 28 | p | 2 | 1 `cast:19`, 6.3 [2.3, 10.3] (n 200) | -, - (n 0) | - | - |
| d21 | 28 | a | 8 | 0 `attack:29,31,108,109,110,114`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

9 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 1: d21 (mean value 97.3%, replaced by d20). Early stopping at 50/100/150 random branches stopped 6 option(s): d0 o1 at 50, d10 o3 at 50, d17 o1 at 100, d17 o2 at 150, d18 o1 at 50, d19 o1 at 150 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 38.3 [31.8, 45.1] (n 200) | - (n 0) |
| 1 | `cast:38` | Springheart Nantuko | 20.0 [11.2, 33.0] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:11` | Zirda, the Dawnwaker | 36.3 [29.9, 43.1] (n 200) | - (n 0) |

**d1** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Zirda, the Dawnwaker | 28.2 [22.5, 34.8] (n 200) | - (n 0) |
| 1 | `pass` | pass | 32.5 [26.4, 39.3] (n 200) | - (n 0) |
| 2 | `cast:38` | Springheart Nantuko | 26.5 [20.9, 33.0] (n 200) | - (n 0) |

**d10** (turn 20, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20,31` | attack Goblin Engineer+Restless Vents | 34.8 [28.5, 41.6] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 35.0 [28.7, 41.8] (n 200) | - (n 0) |
| 2 | `attack:31` | attack Restless Vents | 36.5 [30.1, 43.4] (n 200) | - (n 0) |
| 3 | `attack:20` | attack Goblin Engineer | 23.0 [13.5, 36.3] (n 50, stopped at 50) | - (n 0) |

**d15** (turn 26, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 55.3 [48.3, 62.0] (n 200) | - (n 0) |
| 1 | `cast:29` | Hornet Queen | 76.3 [69.9, 81.6] (n 200) | - (n 0) |
| 2 | `cast:23` | Minsc & Boo, Timeless Heroes | 63.7 [56.9, 70.1] (n 200) | - (n 0) |
| 3 | `cast:19` | Murderous Rider (may play) | 72.0 [65.4, 77.8] (n 200) | - (n 0) |

**d17** (turn 26, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:29` | Hornet Queen | 75.5 [69.1, 80.9] (n 200) | - (n 0) |
| 1 | `pass` | pass | 63.5 [53.7, 72.3] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:23` | Minsc & Boo, Timeless Heroes | 59.3 [51.3, 66.9] (n 150, stopped at 150) | - (n 0) |

**d18** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:23` | Minsc & Boo, Timeless Heroes | 91.5 [86.8, 94.6] (n 200) | - (n 0) |
| 1 | `pass` | pass | 84.0 [71.5, 91.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:19` | Murderous Rider (may play) | 94.8 [90.7, 97.1] (n 200) | - (n 0) |

**d19** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:23#0` | Minsc & Boo, Timeless Heroes: +1: Put three +1/+1 counters o | 93.0 [88.6, 95.8] (n 200) | - (n 0) |
| 1 | `pass` | pass | 89.0 [83.0, 93.1] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:19` | Murderous Rider (may play) | 95.0 [91.0, 97.3] (n 200) | - (n 0) |

**d20** (turn 28, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 91.8 [87.1, 94.8] (n 200) | - (n 0) |
| 1 | `cast:19` | Murderous Rider (may play) | 98.0 [95.0, 99.2] (n 200) | - (n 0) |

**d21** (turn 28, a; option 0 is Forge's answer) -- settled by the screen (mean value 97.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:29,31,108,109,110,114` | attack Boo+Insect Token+Hornet Queen+Insect Token+Insect Token+Restless Vents | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 86.0 [67.7, 94.8] (n 25) | - (n 0) |
| 2 | `attack:29,31,108,109,110` | attack Insect Token+Hornet Queen+Insect Token+Insect Token+Restless Vents | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 3 | `attack:29,31,109,110,114` | attack Boo+Hornet Queen+Insect Token+Insect Token+Restless Vents | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:31,108,109,110,114` | attack Boo+Insect Token+Insect Token+Insect Token+Restless Vents | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:29,31,108,110,114` | attack Boo+Insect Token+Hornet Queen+Insect Token+Restless Vents | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:29,31,108,109,114` | attack Boo+Insect Token+Hornet Queen+Insect Token+Restless Vents | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:29,108,109,110,114` | attack Boo+Insect Token+Hornet Queen+Insect Token+Insect Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

4550 branch games (0 with an error, left out); 177 random and 0 Forge branches ended at the turn cap.

## Checks

91311 rows checked (ids against each seat's own frame log), 9102 frame logs through tools/check-redaction.mjs, 4550 forks checked (0 not the position), 9 no-leak checks (0 moved; the negative control moved in 9). The guardrails read back from 9100 random seats' logs: a land offered at 26067 of 208150 priority decisions and taken at 26067; 0 of 0 opening hands kept; G3 left out a repeated no-op 1600 time(s); G5 (D458): the engine refused 1420 pick(s) it could not pay for, and 507 later offer(s) of them in the same priority window were left out; G6 (D471): 1290 pick(s) of the seats' own X plays had X drawn from 1 up, 108193 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

177 of 4550 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

