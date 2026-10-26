# Move atlas: pauper-2009-00001 vs pauper-2009-00002, seed 2109

D451. Seat A is pauper-2009-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 23 turns, won by B, and listed 27 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 10 | p | 3 | 2 `cast:32`, 2.5 [0.0, 10.5] (n 200) | -, - (n 0) | - | - |
| d1 | 10 | p | 3 | 2 `cast:32`, 7.0 [0.3, 14.8] (n 200) | -, - (n 0) | - | - |
| d5 | 14 | p | 4 | 0 `cast:5`, 0.0 [0.0, 5.0] (n 200) | -, - (n 0) | - | - |
| d8 | 14 | p | 3 | 2 `cast:34`, 7.5 [0.0, 16.0] (n 200) | -, - (n 0) | - | - |
| d12 | 16 | a | 7 | 2 `attack:4,33,34,40,87`, 8.3 [1.5, 18.5] (n 200) | -, - (n 0) | - | - |
| d13 | 17 | b | 6 | 4 `block:40>70`, 22.5 [14.5, 31.0] (n 200) | -, - (n 0) | - | - |
| d15 | 18 | a | 6 | 2 `attack:4,33,34,87`, 1.5 [0.0, 12.3] (n 200) | -, - (n 0) | - | - |
| d16 | 19 | b | 7 | 0 `block:33>55,87>70`, 0.0 [0.0, 8.0] (n 25) | -, - (n 0) | - | - |
| d17 | 20 | p | 3 | 2 `cast:8`, 5.0 [1.0, 9.5] (n 200) | -, - (n 0) | - | - |
| d21 | 22 | p | 4 | 0 `cast:5`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d22 | 22 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d26 | 23 | b | 4 | 0 `block:21>60,90>79`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

12 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 4: d21 (mean value 0.0%, replaced by d16), d26 (mean value 0.0%, replaced by d22), d22 (mean value 0.0%, replaced by d12), d16 (mean value 2.3%, replaced by d1). Early stopping at 50/100/150 random branches stopped 10 option(s): d5 o2 at 50, d13 o1 at 50, d13 o2 at 50, d13 o3 at 50, d13 o5 at 50, d15 o1 at 50, d15 o3 at 50, d15 o5 at 50, d12 o1 at 50, d12 o3 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 60.0 [53.1, 66.5] (n 200) | - (n 0) |
| 1 | `cast:4` | Threadbind Clique | 60.5 [53.6, 67.0] (n 200) | - (n 0) |
| 2 | `cast:32` | Gush | 62.5 [55.6, 68.9] (n 200) | - (n 0) |

**d1** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Threadbind Clique | 52.8 [45.8, 59.6] (n 200) | - (n 0) |
| 1 | `pass` | pass | 56.0 [49.1, 62.7] (n 200) | - (n 0) |
| 2 | `cast:32` | Gush | 59.8 [52.8, 66.3] (n 200) | - (n 0) |

**d5** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Rancor | 51.7 [44.9, 58.6] (n 200) | - (n 0) |
| 1 | `pass` | pass | 43.0 [36.3, 49.9] (n 200) | - (n 0) |
| 2 | `cast:33` | Wood Elves | 33.0 [21.6, 46.8] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:34` | Mogg War Marshal | 47.8 [40.9, 54.6] (n 200) | - (n 0) |

**d8** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:33` | Wood Elves | 44.5 [37.8, 51.4] (n 200) | - (n 0) |
| 1 | `pass` | pass | 43.0 [36.3, 49.9] (n 200) | - (n 0) |
| 2 | `cast:34` | Mogg War Marshal | 52.0 [45.1, 58.8] (n 200) | - (n 0) |

**d12** (turn 16, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:4` | attack Threadbind Clique | 35.3 [29.0, 42.1] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 21.0 [12.0, 34.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:4,33,34,40,87` | attack Threadbind Clique+Wood Elves+Mogg War Marshal+Goblin Token+Fanatical Firebrand | 43.5 [36.8, 50.4] (n 200) | - (n 0) |
| 3 | `attack:4,33` | attack Threadbind Clique+Wood Elves | 20.0 [11.2, 33.0] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:4,34` | attack Threadbind Clique+Mogg War Marshal | 37.0 [30.6, 43.9] (n 200) | - (n 0) |
| 5 | `attack:4,87` | attack Threadbind Clique+Goblin Token | 35.5 [29.2, 42.4] (n 200) | - (n 0) |
| 6 | `attack:4,40` | attack Threadbind Clique+Fanatical Firebrand | 43.0 [36.3, 49.9] (n 200) | - (n 0) |

**d13** (turn 17, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 21.5 [16.4, 27.7] (n 200) | - (n 0) |
| 1 | `block:33>70` | block Wood Elves>Seeker of the Way | 32.0 [20.8, 45.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `block:34>70` | block Mogg War Marshal>Seeker of the Way | 32.0 [20.8, 45.8] (n 50, stopped at 50) | - (n 0) |
| 3 | `block:87>70` | block Goblin Token>Seeker of the Way | 34.0 [22.4, 47.9] (n 50, stopped at 50) | - (n 0) |
| 4 | `block:40>70` | block Fanatical Firebrand>Seeker of the Way | 44.0 [37.3, 50.9] (n 200) | - (n 0) |
| 5 | `block:33>55` | block Wood Elves>Repentant Blacksmith | 30.0 [19.1, 43.8] (n 50, stopped at 50) | - (n 0) |

**d15** (turn 18, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:4` | attack Threadbind Clique | 60.0 [53.1, 66.5] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 30.0 [19.1, 43.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:4,33,34,87` | attack Threadbind Clique+Wood Elves+Mogg War Marshal+Goblin Token | 61.5 [54.6, 68.0] (n 200) | - (n 0) |
| 3 | `attack:4,33` | attack Threadbind Clique+Wood Elves | 48.0 [34.8, 61.5] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:4,34` | attack Threadbind Clique+Mogg War Marshal | 61.5 [54.6, 68.0] (n 200) | - (n 0) |
| 5 | `attack:4,87` | attack Threadbind Clique+Goblin Token | 56.0 [42.3, 68.8] (n 50, stopped at 50) | - (n 0) |

**d16** (turn 19, b; option 0 is Forge's answer) -- settled by the screen (mean value 2.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:33>55,87>70` | block Goblin Token>Seeker of the Way, Wood Elves>Repentant Blacksmith | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:33>55` | block Wood Elves>Repentant Blacksmith | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:87>70` | block Goblin Token>Seeker of the Way | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:33>55,87>70,34>80` | block Goblin Token>Seeker of the Way, Wood Elves>Repentant Blacksmith, Mogg War Marshal>Reckless Fireweaver | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 5 | `block:33>55,34>70,87>70` | block Goblin Token>Seeker of the Way, Wood Elves>Repentant Blacksmith, Mogg War Marshal>Seeker of the Way | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 6 | `block:33>55,34>57,87>70` | block Goblin Token>Seeker of the Way, Wood Elves>Repentant Blacksmith, Mogg War Marshal>Tundra Wolves | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d17** (turn 20, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Rancor | 5.0 [2.7, 9.0] (n 200) | - (n 0) |
| 1 | `pass` | pass | 4.5 [2.4, 8.3] (n 200) | - (n 0) |
| 2 | `cast:8` | Stickytongue Sentinel | 10.0 [6.6, 14.9] (n 200) | - (n 0) |

**d21** (turn 22, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Rancor | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:8` | Stickytongue Sentinel | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `cast:21` | Rubble Rouser | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d22** (turn 22, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:8` | Stickytongue Sentinel | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:21` | Rubble Rouser | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d26** (turn 23, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:21>60,90>79` | block Rubble Rouser>Owlbear, Goblin Token>Firebrand Archer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:90>79` | block Goblin Token>Firebrand Archer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:21>60` | block Rubble Rouser>Owlbear | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

5950 branch games (0 with an error, left out); 157 random and 0 Forge branches ended at the turn cap.

## Checks

223691 rows checked (ids against each seat's own frame log), 11902 frame logs through tools/check-redaction.mjs, 5950 forks checked (0 not the position), 12 no-leak checks (0 moved; the negative control moved in 12). The guardrails read back from 11900 random seats' logs: a land offered at 53488 of 589625 priority decisions and taken at 53488; 0 of 0 opening hands kept; G3 left out a repeated no-op 0 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 1958 pick(s) of the seats' own X plays had X drawn from 1 up, 5762 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

157 of 5950 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

