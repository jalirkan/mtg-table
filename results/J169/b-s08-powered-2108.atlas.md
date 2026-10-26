# Move atlas: powered-2008-00001 vs powered-2008-00002, seed 2108

D451. Seat A is powered-2008-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 13 turns, won by A, and listed 24 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d1 | 1 | p | 3 | 2 `cast:18`, 36.0 [27.8, 44.8] (n 200) | -, - (n 0) | - | - |
| d6 | 7 | p | 6 | 3 `cast:8`, 4.0 [0.0, 10.0] (n 200) | -, - (n 0) | - | - |
| d7 | 7 | p | 5 | 2 `cast:8`, 4.5 [0.5, 10.5] (n 200) | -, - (n 0) | - | - |
| d9 | 7 | p | 6 | 3 `cast:3`, 0.5 [0.0, 8.0] (n 200) | -, - (n 0) | - | - |
| d10 | 7 | p | 5 | 0 `cast:3`, 0.0 [0.0, 2.5] (n 200) | -, - (n 0) | - | - |
| d11 | 9 | p | 5 | 2 `cast:36`, 3.0 [0.0, 9.0] (n 200) | -, - (n 0) | - | - |
| d12 | 9 | a | 4 | 1 `attack:3,17`, 10.0 [5.0, 16.0] (n 200) | -, - (n 0) | - | - |
| d13 | 9 | p | 6 | 0 `activate:18#0`, 0.0 [0.0, 1.5] (n 200) | -, - (n 0) | - | - |
| d14 | 9 | p | 6 | 0 `cast:16`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 11 | p | 6 | 0 `cast:2`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d17 | 11 | a | 6 | 0 `attack:3,16,17,225`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d18 | 11 | p | 3 | 0 `activate:18#0`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d20 | 13 | p | 6 | 1 `pass`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d21 | 13 | p | 5 | 0 `cast:35`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d23 | 13 | a | 8 | 0 `attack:2,3,10,16,17,225,246,247`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

15 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 7: d14 (mean value 96.7%, replaced by d15), d17 (mean value 98.7%, replaced by d18), d20 (mean value 99.3%, replaced by d7), d23 (mean value 100.0%, replaced by d10), d18 (mean value 100.0%, replaced by d21), d21 (mean value 100.0%, replaced by d13), d15 (mean value 99.3%, replaced by d12). Early stopping at 50/100/150 random branches stopped 15 option(s): d1 o1 at 50, d6 o2 at 150, d9 o1 at 50, d9 o2 at 50, d9 o4 at 50, d9 o5 at 50, d13 o1 at 50, d13 o2 at 50, d13 o3 at 100, d13 o4 at 50, d13 o5 at 50, d12 o2 at 150, d10 o1 at 150, d7 o1 at 50, d7 o4 at 150 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d1** (turn 1, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 26.3 [20.6, 32.8] (n 200) | - (n 0) |
| 1 | `cast:36` | Prismari Command | 27.0 [16.7, 40.6] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:18` | Jace, Wielder of Mysteries | 62.3 [55.4, 68.7] (n 200) | - (n 0) |

**d6** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Fervent Champion | 89.5 [84.5, 93.0] (n 200) | - (n 0) |
| 1 | `pass` | pass | 88.5 [83.3, 92.2] (n 200) | - (n 0) |
| 2 | `cast:36` | Prismari Command | 87.0 [80.7, 91.5] (n 150, stopped at 150) | - (n 0) |
| 3 | `cast:8` | Fable of the Mirror-Breaker | 93.5 [89.2, 96.2] (n 200) | - (n 0) |
| 4 | `cast:3` | Hanweir Garrison | 93.0 [88.6, 95.8] (n 200) | - (n 0) |
| 5 | `cast:30` | Spectral Sailor | 87.5 [82.2, 91.4] (n 200) | - (n 0) |

**d7** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 89.5 [84.5, 93.0] (n 200) | - (n 0) |
| 1 | `cast:36` | Prismari Command | 82.0 [69.2, 90.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:8` | Fable of the Mirror-Breaker | 94.0 [89.8, 96.5] (n 200) | - (n 0) |
| 3 | `cast:3` | Hanweir Garrison | 94.0 [89.8, 96.5] (n 200) | - (n 0) |
| 4 | `cast:30` | Spectral Sailor | 87.3 [81.1, 91.7] (n 150, stopped at 150) | - (n 0) |

**d9** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:18#0` | Jace, Wielder of Mysteries: +1: Target player mills two card | 92.5 [88.0, 95.4] (n 200) | - (n 0) |
| 1 | `pass` | pass | 90.0 [78.6, 95.7] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:8` | Fable of the Mirror-Breaker | 92.0 [81.2, 96.9] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:3` | Hanweir Garrison | 93.0 [88.6, 95.8] (n 200) | - (n 0) |
| 4 | `cast:36` | Prismari Command | 90.0 [78.6, 95.7] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:30` | Spectral Sailor | 90.0 [78.6, 95.7] (n 50, stopped at 50) | - (n 0) |

**d10** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Hanweir Garrison | 95.0 [91.0, 97.3] (n 200) | - (n 0) |
| 1 | `pass` | pass | 86.7 [80.3, 91.2] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:8` | Fable of the Mirror-Breaker | 93.0 [88.6, 95.8] (n 200) | - (n 0) |
| 3 | `cast:36` | Prismari Command | 91.0 [86.2, 94.2] (n 200) | - (n 0) |
| 4 | `cast:30` | Spectral Sailor | 91.0 [86.2, 94.2] (n 200) | - (n 0) |

**d11** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 89.0 [83.9, 92.6] (n 200) | - (n 0) |
| 1 | `cast:16` | Two-Headed Giant of Foriys | 90.0 [85.1, 93.4] (n 200) | - (n 0) |
| 2 | `cast:36` | Prismari Command | 92.0 [87.4, 95.0] (n 200) | - (n 0) |
| 3 | `cast:8` | Fable of the Mirror-Breaker | 91.5 [86.8, 94.6] (n 200) | - (n 0) |
| 4 | `cast:30` | Spectral Sailor | 91.0 [86.2, 94.2] (n 200) | - (n 0) |

**d12** (turn 9, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 82.0 [76.1, 86.7] (n 200) | - (n 0) |
| 1 | `attack:3,17` | attack Fervent Champion+Hanweir Garrison | 92.0 [87.4, 95.0] (n 200) | - (n 0) |
| 2 | `attack:17` | attack Fervent Champion | 86.3 [79.9, 90.9] (n 150, stopped at 150) | - (n 0) |
| 3 | `attack:3` | attack Hanweir Garrison | 90.5 [85.6, 93.8] (n 200) | - (n 0) |

**d13** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:18#0` | Jace, Wielder of Mysteries: +1: Target player mills two card | 98.5 [95.7, 99.5] (n 200) | - (n 0) |
| 1 | `pass` | pass | 92.0 [81.2, 96.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:16` | Two-Headed Giant of Foriys | 84.0 [71.5, 91.7] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:8` | Fable of the Mirror-Breaker | 94.0 [87.5, 97.2] (n 100, stopped at 100) | - (n 0) |
| 4 | `cast:36` | Prismari Command | 92.0 [81.2, 96.9] (n 50, stopped at 50) | - (n 0) |
| 5 | `cast:30` | Spectral Sailor | 92.0 [81.2, 96.9] (n 50, stopped at 50) | - (n 0) |

**d14** (turn 9, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:16` | Two-Headed Giant of Foriys | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:8` | Fable of the Mirror-Breaker | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:10` | Screaming Nemesis | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 4 | `cast:36` | Prismari Command | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 5 | `cast:30` | Spectral Sailor | 92.0 [75.0, 97.8] (n 25) | - (n 0) |

**d15** (turn 11, p; option 0 is Forge's answer) -- settled by the screen (mean value 99.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:2` | Sower of Temptation | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:10` | Screaming Nemesis | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:36` | Prismari Command | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 4 | `cast:8` | Fable of the Mirror-Breaker | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `cast:30` | Spectral Sailor | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d17** (turn 11, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,16,17,225` | attack Two-Headed Giant of Foriys+Fervent Champion+Boo+Hanweir Garrison | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 2 | `attack:3,17,225` | attack Fervent Champion+Boo+Hanweir Garrison | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:3,16,225` | attack Two-Headed Giant of Foriys+Boo+Hanweir Garrison | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:3,16,17` | attack Two-Headed Giant of Foriys+Fervent Champion+Hanweir Garrison | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:16,17,225` | attack Two-Headed Giant of Foriys+Fervent Champion+Boo | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d18** (turn 11, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:18#0` | Jace, Wielder of Mysteries: +1: Target player mills two card | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:30` | Spectral Sailor | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d20** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 99.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:10` | Screaming Nemesis | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:35` | The Wondrous Wasp | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:36` | Prismari Command | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:8` | Fable of the Mirror-Breaker | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `cast:30` | Spectral Sailor | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d21** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:35` | The Wondrous Wasp | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:36` | Prismari Command | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:8` | Fable of the Mirror-Breaker | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:30` | Spectral Sailor | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d23** (turn 13, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:2,3,10,16,17,225,246,247` | attack Two-Headed Giant of Foriys+Fervent Champion+Boo+Sower of Temptation+Hanweir Garrison+Human Token+Human Token+Screaming Nemesis | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:2,3,10,17,225,246,247` | attack Fervent Champion+Boo+Sower of Temptation+Hanweir Garrison+Human Token+Human Token+Screaming Nemesis | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:2,3,10,16,225,246,247` | attack Two-Headed Giant of Foriys+Boo+Sower of Temptation+Hanweir Garrison+Human Token+Human Token+Screaming Nemesis | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:2,3,10,16,17,246,247` | attack Two-Headed Giant of Foriys+Fervent Champion+Sower of Temptation+Hanweir Garrison+Human Token+Human Token+Screaming Nemesis | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:3,10,16,17,225,246,247` | attack Two-Headed Giant of Foriys+Fervent Champion+Boo+Hanweir Garrison+Human Token+Human Token+Screaming Nemesis | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:2,10,16,17,225,246,247` | attack Two-Headed Giant of Foriys+Fervent Champion+Boo+Sower of Temptation+Human Token+Human Token+Screaming Nemesis | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:2,3,10,16,17,225,247` | attack Two-Headed Giant of Foriys+Fervent Champion+Boo+Sower of Temptation+Hanweir Garrison+Human Token+Screaming Nemesis | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

7200 branch games (0 with an error, left out); 0 random and 0 Forge branches ended at the turn cap.

## Checks

169873 rows checked (ids against each seat's own frame log), 14402 frame logs through tools/check-redaction.mjs, 7200 forks checked (0 not the position), 15 no-leak checks (0 moved; the negative control moved in 15). The guardrails read back from 14400 random seats' logs: a land offered at 63054 of 522311 priority decisions and taken at 63054; 0 of 0 opening hands kept; G3 left out a repeated no-op 210 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 3576 pick(s) of the seats' own X plays had X drawn from 1 up, 183899 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

