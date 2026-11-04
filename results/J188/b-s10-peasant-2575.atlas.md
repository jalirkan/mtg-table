# Move atlas: peasant-2475-00001 vs peasant-2475-00002, seed 2575

D451. Seat A is peasant-2475-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 23 turns, won by B, and listed 40 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d6 | 8 | p | 4 | 2 `cast:34`, 11.3 [1.3, 21.3] (n 150) | -, - (n 0) | - | - |
| d11 | 10 | a | 4 | 3 `attack:17`, 7.7 [0.0, 16.3] (n 150) | -, - (n 0) | - | - |
| d14 | 12 | p | 5 | 1 `cast:22`, 30.7 [21.3, 40.0] (n 150) | -, - (n 0) | - | - |
| d18 | 14 | p | 5 | 2 `cast:32`, 13.3 [4.7, 21.3] (n 150) | -, - (n 0) | - | - |
| d22 | 16 | p | 5 | 2 `cast:35`, 4.0 [0.0, 14.7] (n 150) | -, - (n 0) | - | - |
| d24 | 16 | p | 5 | 0 `cast:36`, 0.0 [0.0, 16.1] (n 50) | -, - (n 0) | - | - |
| d28 | 18 | p | 4 | 3 `cast:13`, 6.0 [0.0, 14.0] (n 150) | -, - (n 0) | - | - |
| d32 | 20 | p | 3 | 0 `cast:13`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d35 | 21 | b | 5 | 0 `block:13>44,32>74,226>75`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d36 | 22 | p | 6 | 2 `cast:39`, 12.7 [5.3, 21.3] (n 150) | -, - (n 0) | - | - |
| d38 | 22 | p | 6 | 3 `cast:39`, 18.7 [12.7, 25.3] (n 150) | -, - (n 0) | - | - |
| d39 | 23 | b | 4 | 0 `block:13>74,37>75`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

12 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 2: d35 (mean value 3.2%, replaced by d36), d39 (mean value 0.0%, replaced by d38). Early stopping at 50/100 random branches stopped 14 option(s): d11 o1 at 50, d14 o2 at 50, d14 o3 at 50, d14 o4 at 50, d18 o1 at 50, d18 o3 at 50, d18 o4 at 50, d28 o1 at 50, d38 o1 at 50, d38 o2 at 50, d38 o5 at 100, d36 o1 at 50, d36 o3 at 50, d36 o4 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 2. It stopped 2 (d24, d32), each a partial label at that n, never confident, saving at most 800 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d6** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 49.3 [41.4, 57.3] (n 150) | - (n 0) |
| 1 | `cast:17` | Erhnam Djinn | 54.0 [46.0, 61.8] (n 150) | - (n 0) |
| 2 | `cast:34` | Biomechan Engineer | 60.7 [52.7, 68.1] (n 150) | - (n 0) |
| 3 | `cast:36` | Nasty Little Rabbit | 46.0 [38.2, 54.0] (n 150) | - (n 0) |

**d11** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:17,33` | attack Erhnam Djinn+Spectral Sailor | 52.0 [44.1, 59.8] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 40.0 [27.6, 53.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:33` | attack Spectral Sailor | 48.0 [40.2, 55.9] (n 150) | - (n 0) |
| 3 | `attack:17` | attack Erhnam Djinn | 59.7 [51.7, 67.2] (n 150) | - (n 0) |

**d14** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 29.3 [22.6, 37.1] (n 150) | - (n 0) |
| 1 | `cast:22` | Ka-Zar of the Savage Land | 60.0 [52.0, 67.5] (n 150) | - (n 0) |
| 2 | `cast:36` | Nasty Little Rabbit | 40.0 [27.6, 53.8] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:32` | Pizza Face, Gastromancer | 20.0 [11.2, 33.0] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:35` | Talisman of Creativity | 28.0 [17.5, 41.7] (n 50, stopped at 50) | - (n 0) |

**d18** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 16.7 [11.6, 23.4] (n 150) | - (n 0) |
| 1 | `cast:36` | Nasty Little Rabbit | 16.0 [8.3, 28.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:32` | Pizza Face, Gastromancer | 30.0 [23.2, 37.8] (n 150) | - (n 0) |
| 3 | `cast:35` | Talisman of Creativity | 10.0 [4.3, 21.4] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:19` | Lessons from Life | 12.0 [5.6, 23.8] (n 50, stopped at 50) | - (n 0) |

**d22** (turn 16, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 33.3 [26.3, 41.2] (n 150) | - (n 0) |
| 1 | `cast:36` | Nasty Little Rabbit | 34.0 [26.9, 41.9] (n 150) | - (n 0) |
| 2 | `cast:35` | Talisman of Creativity | 37.3 [30.0, 45.3] (n 150) | - (n 0) |
| 3 | `cast:19` | Lessons from Life | 35.3 [28.1, 43.3] (n 150) | - (n 0) |
| 4 | `cast:13` | Prosperous Innkeeper | 29.3 [22.6, 37.1] (n 150) | - (n 0) |

**d24** (turn 16, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:36` | Nasty Little Rabbit | 38.0 [25.9, 51.8] (n 50) | - (n 0) |
| 1 | `pass` | pass | 24.0 [14.3, 37.4] (n 50) | - (n 0) |
| 2 | `cast:35` | Talisman of Creativity | 36.0 [24.1, 49.9] (n 50) | - (n 0) |
| 3 | `cast:13` | Prosperous Innkeeper | 38.0 [25.9, 51.8] (n 50) | - (n 0) |
| 4 | `cast:19` | Lessons from Life | 30.0 [19.1, 43.8] (n 50) | - (n 0) |

**d28** (turn 18, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:2` | Paradox Surveyor | 22.0 [16.1, 29.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:19` | Lessons from Life | 16.7 [11.6, 23.4] (n 150) | - (n 0) |
| 3 | `cast:13` | Prosperous Innkeeper | 28.0 [21.4, 35.7] (n 150) | - (n 0) |

**d32** (turn 20, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Prosperous Innkeeper | 14.0 [7.0, 26.2] (n 50) | - (n 0) |
| 1 | `pass` | pass | 12.0 [5.6, 23.8] (n 50) | - (n 0) |
| 2 | `cast:19` | Lessons from Life | 8.0 [3.1, 18.8] (n 50) | - (n 0) |

**d35** (turn 21, b; option 0 is Forge's answer) -- settled by the screen (mean value 3.2%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:13>44,32>74,226>75` | block Pizza Face, Gastromancer>Captain Storm, Cosmium Raider, Eldrazi Spawn Token>Sunastian Falconer, Prosperous Innkeeper>Gut, True Soul Zealot | 16.0 [6.4, 34.6] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:13>44,226>75` | block Eldrazi Spawn Token>Sunastian Falconer, Prosperous Innkeeper>Gut, True Soul Zealot | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:13>44,32>74` | block Pizza Face, Gastromancer>Captain Storm, Cosmium Raider, Prosperous Innkeeper>Gut, True Soul Zealot | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:32>74,226>75` | block Pizza Face, Gastromancer>Captain Storm, Cosmium Raider, Eldrazi Spawn Token>Sunastian Falconer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d36** (turn 22, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 12.0 [7.7, 18.2] (n 150) | - (n 0) |
| 1 | `cast:21` | Killer Bees | 4.0 [1.1, 13.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:39` | Grizzly Fate | 24.7 [18.5, 32.1] (n 150) | - (n 0) |
| 3 | `cast:37` | Spinewoods Armadillo | 6.0 [2.1, 16.2] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:18` | Life // Death — Life | 8.0 [4.1, 15.0] (n 100, stopped at 100) | - (n 0) |
| 5 | `cast:12` | Vengeful Rebel | 16.7 [11.6, 23.4] (n 150) | - (n 0) |

**d38** (turn 22, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Spinewoods Armadillo | 2.7 [1.0, 6.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:21` | Killer Bees | 4.0 [1.1, 13.5] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:39` | Grizzly Fate | 21.3 [15.5, 28.6] (n 150) | - (n 0) |
| 4 | `cast:12` | Vengeful Rebel | 14.0 [9.3, 20.5] (n 150) | - (n 0) |
| 5 | `cast:18` | Life // Death — Life | 5.0 [2.1, 11.2] (n 100, stopped at 100) | - (n 0) |

**d39** (turn 23, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:13>74,37>75` | block Prosperous Innkeeper>Captain Storm, Cosmium Raider, Spinewoods Armadillo>Sunastian Falconer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:37>75` | block Spinewoods Armadillo>Sunastian Falconer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:13>74` | block Prosperous Innkeeper>Captain Storm, Cosmium Raider | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

5175 branch games (0 with an error, left out); 1 random and 0 Forge branches ended at the turn cap.

## Checks

125575 rows checked (ids against each seat's own frame log), 10352 frame logs through tools/check-redaction.mjs, 5175 forks checked (0 not the position), 12 no-leak checks (0 moved; the negative control moved in 12). The guardrails read back from 10350 random seats' logs: a land offered at 21155 of 189220 priority decisions and taken at 21155; 0 of 0 opening hands kept; G3 left out a repeated no-op 3423 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

1 of 5175 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

