# Move atlas: peasant-2010-00001 vs peasant-2010-00002, seed 2110

D451. Seat A is peasant-2010-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 27 turns, won by A, and listed 46 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 5 | p | 4 | 3 `cast:23`, 4.8 [0.0, 13.0] (n 200) | -, - (n 0) | - | - |
| d10 | 11 | p | 3 | 1 `cast:28`, 9.5 [2.0, 18.0] (n 200) | -, - (n 0) | - | - |
| d15 | 13 | a | 4 | 1 `attack:10,28`, 9.8 [4.3, 17.0] (n 200) | -, - (n 0) | - | - |
| d22 | 17 | a | 7 | 5 `attack:10,28,38`, 4.3 [0.0, 13.0] (n 200) | -, - (n 0) | - | - |
| d28 | 21 | a | 5 | 2 `attack:14,27,28`, 5.8 [0.0, 14.0] (n 200) | -, - (n 0) | - | - |
| d33 | 23 | p | 3 | 0 `cast:11`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |
| d40 | 25 | p | 4 | 2 `cast:2`, 6.3 [2.5, 13.0] (n 200) | -, - (n 0) | - | - |
| d45 | 27 | a | 8 | 0 `attack:14,17,19,27`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |

### The cut design (D480)

8 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100/150 random branches stopped 10 option(s): d15 o3 at 100, d22 o3 at 150, d22 o4 at 50, d28 o1 at 50, d28 o4 at 50, d33 o1 at 150, d33 o2 at 150, d45 o1 at 50, d45 o4 at 50, d45 o6 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:37#0` | Perilous Landscape: {T}, Sacrifice CARDNAME: Search your lib | 29.0 [23.2, 35.6] (n 200) | - (n 0) |
| 1 | `pass` | pass | 24.5 [19.1, 30.9] (n 200) | - (n 0) |
| 2 | `cast:28` | Morbid Opportunist | 25.8 [20.2, 32.2] (n 200) | - (n 0) |
| 3 | `cast:23` | Ivora, Insatiable Heir | 33.8 [27.6, 40.6] (n 200) | - (n 0) |

**d10** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 23.5 [18.2, 29.8] (n 200) | - (n 0) |
| 1 | `cast:28` | Morbid Opportunist | 33.0 [26.9, 39.8] (n 200) | - (n 0) |
| 2 | `cast:38` | Carrion Ants | 28.0 [22.2, 34.6] (n 200) | - (n 0) |

**d15** (turn 13, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 30.3 [24.3, 36.9] (n 200) | - (n 0) |
| 1 | `attack:10,28` | attack Scolding Administrator+Morbid Opportunist | 40.0 [33.5, 46.9] (n 200) | - (n 0) |
| 2 | `attack:10` | attack Scolding Administrator | 38.0 [31.6, 44.9] (n 200) | - (n 0) |
| 3 | `attack:28` | attack Morbid Opportunist | 31.5 [23.2, 41.1] (n 100, stopped at 100) | - (n 0) |

**d22** (turn 17, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:10,38` | attack Carrion Ants+Scolding Administrator | 59.8 [52.8, 66.3] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 59.0 [52.1, 65.6] (n 200) | - (n 0) |
| 2 | `attack:10,17,28,38` | attack Carrion Ants+Scolding Administrator+Morbid Opportunist+Juri, Master of the Revue | 60.5 [53.6, 67.0] (n 200) | - (n 0) |
| 3 | `attack:10` | attack Scolding Administrator | 47.0 [39.2, 55.0] (n 150, stopped at 150) | - (n 0) |
| 4 | `attack:38` | attack Carrion Ants | 51.0 [37.6, 64.3] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:10,28,38` | attack Carrion Ants+Scolding Administrator+Morbid Opportunist | 64.0 [57.1, 70.3] (n 200) | - (n 0) |
| 6 | `attack:10,17,38` | attack Carrion Ants+Scolding Administrator+Juri, Master of the Revue | 59.0 [52.1, 65.6] (n 200) | - (n 0) |

**d28** (turn 21, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:14` | attack Artisan of Kozilek | 64.5 [57.6, 70.8] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 50.0 [36.6, 63.4] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:14,27,28` | attack Artisan of Kozilek+Morbid Opportunist+Signal Pest | 70.3 [63.6, 76.2] (n 200) | - (n 0) |
| 3 | `attack:14,28` | attack Artisan of Kozilek+Morbid Opportunist | 66.3 [59.5, 72.4] (n 200) | - (n 0) |
| 4 | `attack:14,27` | attack Artisan of Kozilek+Signal Pest | 56.0 [42.3, 68.8] (n 50, stopped at 50) | - (n 0) |

**d33** (turn 23, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Unearth | 63.0 [56.1, 69.4] (n 200) | - (n 0) |
| 1 | `pass` | pass | 51.7 [43.7, 59.5] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:35` | Sensei's Divining Top | 50.0 [42.1, 57.9] (n 150, stopped at 150) | - (n 0) |

**d40** (turn 25, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:9` | Nahiri, Storm of Stone | 81.5 [75.5, 86.3] (n 200) | - (n 0) |
| 1 | `pass` | pass | 87.3 [81.9, 91.2] (n 200) | - (n 0) |
| 2 | `cast:2` | Exorcist | 87.8 [82.5, 91.6] (n 200) | - (n 0) |
| 3 | `cast:35` | Sensei's Divining Top | 86.3 [80.8, 90.3] (n 200) | - (n 0) |

**d45** (turn 27, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:14,17,19,27` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Signal Pest+Artisan of Kozilek | 100.0 [98.1, 100.0] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 80.0 [67.0, 88.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:2,14,17,19,27,28` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Signal Pest+Artisan of Kozilek+Morbid Opportunist+Exorcist | 100.0 [98.1, 100.0] (n 200) | - (n 0) |
| 3 | `attack:14,19,27` | attack Two-Headed Giant of Foriys+Signal Pest+Artisan of Kozilek | 100.0 [98.1, 100.0] (n 200) | - (n 0) |
| 4 | `attack:14,17,27` | attack Juri, Master of the Revue+Signal Pest+Artisan of Kozilek | 92.0 [81.2, 96.9] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:14,17,19` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Artisan of Kozilek | 100.0 [98.1, 100.0] (n 200) | - (n 0) |
| 6 | `attack:17,19,27` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Signal Pest | 93.0 [86.3, 96.6] (n 100, stopped at 100) | - (n 0) |
| 7 | `attack:14,17,19,27,28` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Signal Pest+Artisan of Kozilek+Morbid Opportunist | 100.0 [98.1, 100.0] (n 200) | - (n 0) |

6500 branch games (0 with an error, left out); 79 random and 0 Forge branches ended at the turn cap.

## Checks

231873 rows checked (ids against each seat's own frame log), 13002 frame logs through tools/check-redaction.mjs, 6500 forks checked (0 not the position), 8 no-leak checks (0 moved; the negative control moved in 8). The guardrails read back from 13000 random seats' logs: a land offered at 36678 of 502821 priority decisions and taken at 36678; 0 of 0 opening hands kept; G3 left out a repeated no-op 1353 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

79 of 6500 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

