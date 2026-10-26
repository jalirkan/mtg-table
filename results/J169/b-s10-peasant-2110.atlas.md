# Move atlas: peasant-2010-00001 vs peasant-2010-00002, seed 2110

D451. Seat A is peasant-2010-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 27 turns, won by A, and listed 46 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 5 | p | 4 | 3 `cast:23`, 11.8 [3.5, 19.8] (n 200) | -, - (n 0) | - | - |
| d10 | 11 | p | 3 | 1 `cast:28`, 6.8 [1.3, 15.0] (n 200) | -, - (n 0) | - | - |
| d15 | 13 | a | 4 | 1 `attack:10,28`, 7.2 [0.7, 14.8] (n 200) | -, - (n 0) | - | - |
| d22 | 17 | a | 7 | 0 `attack:10,38`, 0.0 [0.0, 6.8] (n 200) | -, - (n 0) | - | - |
| d28 | 21 | a | 5 | 2 `attack:14,27,28`, 9.0 [1.0, 17.5] (n 200) | -, - (n 0) | - | - |
| d33 | 23 | p | 3 | 0 `cast:11`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |
| d40 | 25 | p | 4 | 0 `cast:9`, 0.0 [0.0, 4.5] (n 200) | -, - (n 0) | - | - |
| d43 | 27 | p | 4 | 1 `pass`, 0.5 [0.0, 4.5] (n 200) | -, - (n 0) | - | - |
| d44 | 27 | p | 3 | 1 `cast:4`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d45 | 27 | a | 8 | 0 `attack:14,17,19,27`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

10 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 2: d45 (mean value 99.0%, replaced by d44), d44 (mean value 97.3%, replaced by d43). Early stopping at 50/100/150 random branches stopped 7 option(s): d2 o1 at 100, d2 o2 at 50, d22 o2 at 150, d22 o3 at 100, d28 o1 at 50, d33 o1 at 100, d33 o2 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:37#0` | Perilous Landscape: {T}, Sacrifice CARDNAME: Search your lib | 21.5 [16.4, 27.7] (n 200) | - (n 0) |
| 1 | `pass` | pass | 17.0 [10.9, 25.6] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:28` | Morbid Opportunist | 14.0 [7.0, 26.2] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:23` | Ivora, Insatiable Heir | 33.3 [27.1, 40.0] (n 200) | - (n 0) |

**d10** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 16.3 [11.8, 22.0] (n 200) | - (n 0) |
| 1 | `cast:28` | Morbid Opportunist | 23.0 [17.7, 29.3] (n 200) | - (n 0) |
| 2 | `cast:38` | Carrion Ants | 22.3 [17.0, 28.5] (n 200) | - (n 0) |

**d15** (turn 13, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 19.0 [14.2, 25.0] (n 200) | - (n 0) |
| 1 | `attack:10,28` | attack Scolding Administrator+Morbid Opportunist | 26.3 [20.6, 32.8] (n 200) | - (n 0) |
| 2 | `attack:10` | attack Scolding Administrator | 22.3 [17.0, 28.5] (n 200) | - (n 0) |
| 3 | `attack:28` | attack Morbid Opportunist | 18.5 [13.7, 24.5] (n 200) | - (n 0) |

**d22** (turn 17, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:10,38` | attack Carrion Ants+Scolding Administrator | 57.0 [50.1, 63.7] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 48.3 [41.4, 55.1] (n 200) | - (n 0) |
| 2 | `attack:10,17,28,38` | attack Carrion Ants+Scolding Administrator+Morbid Opportunist+Juri, Master of the Revue | 42.0 [34.4, 50.0] (n 150, stopped at 150) | - (n 0) |
| 3 | `attack:10` | attack Scolding Administrator | 39.5 [30.5, 49.3] (n 100, stopped at 100) | - (n 0) |
| 4 | `attack:38` | attack Carrion Ants | 54.5 [47.6, 61.3] (n 200) | - (n 0) |
| 5 | `attack:10,28,38` | attack Carrion Ants+Scolding Administrator+Morbid Opportunist | 51.5 [44.6, 58.3] (n 200) | - (n 0) |
| 6 | `attack:10,17,38` | attack Carrion Ants+Scolding Administrator+Juri, Master of the Revue | 52.5 [45.6, 59.3] (n 200) | - (n 0) |

**d28** (turn 21, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:14` | attack Artisan of Kozilek | 54.8 [47.8, 61.5] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 35.0 [23.3, 48.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:14,27,28` | attack Artisan of Kozilek+Morbid Opportunist+Signal Pest | 63.7 [56.9, 70.1] (n 200) | - (n 0) |
| 3 | `attack:14,28` | attack Artisan of Kozilek+Morbid Opportunist | 55.8 [48.8, 62.5] (n 200) | - (n 0) |
| 4 | `attack:14,27` | attack Artisan of Kozilek+Signal Pest | 53.0 [46.1, 59.8] (n 200) | - (n 0) |

**d33** (turn 23, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Unearth | 56.0 [49.1, 62.7] (n 200) | - (n 0) |
| 1 | `pass` | pass | 38.0 [29.1, 47.8] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:35` | Sensei's Divining Top | 36.0 [24.1, 49.9] (n 50, stopped at 50) | - (n 0) |

**d40** (turn 25, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:9` | Nahiri, Storm of Stone | 89.5 [84.5, 93.0] (n 200) | - (n 0) |
| 1 | `pass` | pass | 84.8 [79.1, 89.1] (n 200) | - (n 0) |
| 2 | `cast:2` | Exorcist | 87.5 [82.2, 91.4] (n 200) | - (n 0) |
| 3 | `cast:35` | Sensei's Divining Top | 88.0 [82.8, 91.8] (n 200) | - (n 0) |

**d43** (turn 27, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:26` | Evolving Wilds: {T}, Sacrifice CARDNAME: Search your library | 96.0 [92.3, 98.0] (n 200) | - (n 0) |
| 1 | `pass` | pass | 96.5 [93.0, 98.3] (n 200) | - (n 0) |
| 2 | `cast:4` | Dauntless Scrapbot | 96.0 [92.3, 98.0] (n 200) | - (n 0) |
| 3 | `cast:35` | Sensei's Divining Top | 93.0 [88.6, 95.8] (n 200) | - (n 0) |

**d44** (turn 27, p; option 0 is Forge's answer) -- settled by the screen (mean value 97.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `cast:4` | Dauntless Scrapbot | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:35` | Sensei's Divining Top | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d45** (turn 27, a; option 0 is Forge's answer) -- settled by the screen (mean value 99.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:14,17,19,27` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Signal Pest+Artisan of Kozilek | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 2 | `attack:2,14,17,19,27,28` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Signal Pest+Artisan of Kozilek+Morbid Opportunist+Exorcist | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:14,19,27` | attack Two-Headed Giant of Foriys+Signal Pest+Artisan of Kozilek | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:14,17,27` | attack Juri, Master of the Revue+Signal Pest+Artisan of Kozilek | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:14,17,19` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Artisan of Kozilek | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:17,19,27` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Signal Pest | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:14,17,19,27,28` | attack Juri, Master of the Revue+Two-Headed Giant of Foriys+Signal Pest+Artisan of Kozilek+Morbid Opportunist | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

6275 branch games (0 with an error, left out); 74 random and 0 Forge branches ended at the turn cap.

## Checks

232771 rows checked (ids against each seat's own frame log), 12552 frame logs through tools/check-redaction.mjs, 6275 forks checked (0 not the position), 10 no-leak checks (0 moved; the negative control moved in 10). The guardrails read back from 12550 random seats' logs: a land offered at 35162 of 657675 priority decisions and taken at 35162; 0 of 0 opening hands kept; G3 left out a repeated no-op 887 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

74 of 6275 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

